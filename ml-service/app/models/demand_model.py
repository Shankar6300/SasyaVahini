"""
SasyaVahini ML — Demand Model (Loading & Prediction)

Loads trained model artifacts and provides prediction functions.
Includes a rule-based fallback for when models haven't been trained yet
(e.g. first run, or before real data is available).

The fallback is always clearly marked in the response so consumers know
they're getting heuristic estimates, not ML predictions.
"""

import math
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
import pandas as pd

from app.config import (
    DEMAND_MODEL_PATH,
    FEATURE_COLUMNS_PATH,
    MODEL_METADATA_PATH,
    MODEL_VERSION,
    PRICE_MODEL_PATH,
)
from app.training.features import build_feature_row, detect_season


# ── Module-level state (loaded once at import or via load_models()) ──────────

_demand_model = None
_price_model = None
_feature_columns: list[str] = []
_metadata: dict = {}
_models_loaded = False


def load_models() -> bool:
    """
    Attempt to load trained model artifacts from disk.
    Returns True if models loaded successfully, False otherwise.
    """
    global _demand_model, _price_model, _feature_columns, _metadata, _models_loaded

    try:
        if not DEMAND_MODEL_PATH.exists() or not PRICE_MODEL_PATH.exists():
            print("[ML] Model files not found — will use rule-based fallback")
            _models_loaded = False
            return False

        _demand_model = joblib.load(DEMAND_MODEL_PATH)
        _price_model = joblib.load(PRICE_MODEL_PATH)
        _feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

        if MODEL_METADATA_PATH.exists():
            _metadata = joblib.load(MODEL_METADATA_PATH)

        _models_loaded = True
        print(f"[ML] Models loaded — version: {_metadata.get('model_version', 'unknown')}")
        return True

    except Exception as e:
        print(f"[ML] Warning: Could not load models ({e}) — using fallback")
        _models_loaded = False
        return False


def are_models_loaded() -> bool:
    """Check if ML models are loaded and ready for prediction."""
    return _models_loaded


def get_model_version() -> str:
    """Return the version tag of the loaded model, or the default."""
    return _metadata.get("model_version", MODEL_VERSION)


def get_model_metadata() -> dict:
    """Return full model metadata (training date, R² scores, etc.)."""
    return dict(_metadata)


def predict_demand(
    crop: str,
    district: str,
    state: str,
    month: Optional[int] = None,
    season: Optional[str] = None,
    festival_period: bool = False,
    previous_demand_kg: Optional[float] = None,
    current_supply_kg: Optional[float] = None,
    temperature_celsius: Optional[float] = None,
) -> dict:
    """
    Predict crop demand for a given region and time period.

    Returns a dict matching the DemandForecastResponse schema.
    Uses the trained ML model if available, otherwise falls back to
    a rule-based heuristic (clearly flagged in the response).
    """
    if month is None:
        month = datetime.now().month

    if season is None:
        season = detect_season(month)

    # Defaults for optional params
    supply = current_supply_kg if current_supply_kg is not None else 10000.0
    prev_demand = previous_demand_kg if previous_demand_kg is not None else 12000.0

    if _models_loaded and _demand_model is not None:
        # ── ML model prediction ──────────────────────────────────────
        row = build_feature_row(
            crop=crop,
            district=district,
            month=month,
            season=season,
            festival_period=festival_period,
            previous_demand_kg=prev_demand,
            current_supply_kg=supply,
            temperature_celsius=temperature_celsius,
        )

        # Ensure column order matches training
        df_input = pd.DataFrame([row])[_feature_columns]
        predicted_demand = float(_demand_model.predict(df_input)[0])
        predicted_demand = max(2000, round(predicted_demand))

        # Confidence: use the CV R² from training as a base,
        # then adjust based on whether this crop/district was in training data
        base_confidence = _metadata.get("demand_cv_r2", 0.75)
        confidence = round(min(0.99, base_confidence), 3)

        # Explainability: real feature importances
        explanations = _build_explanations(row, predicted_demand, supply)
        is_fallback = False

    else:
        # ── Rule-based fallback ──────────────────────────────────────
        festival_boost = 3000 if festival_period else 0
        predicted_demand = prev_demand * 1.1 + festival_boost
        predicted_demand = max(3000, round(predicted_demand))
        confidence = 0.4  # Low confidence for heuristic
        explanations = [
            "Prediction based on rule-based heuristic (ML model not yet trained)",
            f"Previous demand ({prev_demand:,.0f} kg) scaled by 1.1× seasonal factor",
        ]
        if festival_period:
            explanations.append("Festival period: +3,000 kg demand boost applied")
        is_fallback = True

    # Common calculations
    demand_gap = round(predicted_demand - supply)

    if demand_gap > 3000:
        demand_level = "HIGH"
    elif demand_gap > 0:
        demand_level = "MEDIUM"
    else:
        demand_level = "LOW"

    return {
        "crop": crop,
        "district": district,
        "state": state,
        "predicted_demand_kg": predicted_demand,
        "current_supply_kg": supply,
        "demand_gap_kg": demand_gap,
        "demand_level": demand_level,
        "recommended_price_per_kg": None,  # Filled by price model if called separately
        "confidence_score": confidence,
        "model_version": get_model_version(),
        "is_fallback": is_fallback,
        "explanations": explanations,
    }


def predict_price(
    crop: str,
    district: str,
    state: str,
    quantity_kg: float,
    current_supply_kg: Optional[float] = None,
    predicted_demand_kg: Optional[float] = None,
    historical_price_per_kg: Optional[float] = None,
) -> dict:
    """
    Recommend a fair listing price per kg based on demand-supply dynamics.
    """
    supply = current_supply_kg if current_supply_kg is not None else 10000.0
    demand = predicted_demand_kg if predicted_demand_kg is not None else 15000.0
    base_price = historical_price_per_kg if historical_price_per_kg is not None else 25.0

    if _models_loaded and _price_model is not None:
        row = build_feature_row(
            crop=crop,
            district=district,
            month=datetime.now().month,
            previous_demand_kg=demand,
            current_supply_kg=supply,
        )
        df_input = pd.DataFrame([row])[_feature_columns]
        recommended = float(_price_model.predict(df_input)[0])
        recommended = max(5.0, round(recommended, 2))
        is_fallback = False
    else:
        # Fallback: demand-supply gap pricing
        gap = demand - supply
        recommended = base_price + (gap / 2000) * 1.5
        recommended = max(5.0, round(recommended, 2))
        is_fallback = True

    price_min = max(5.0, round(recommended * 0.9, 2))
    price_max = round(recommended * 1.1, 2)

    explanations = []
    gap = demand - supply
    if gap > 3000:
        explanations.append(f"High demand-supply gap ({gap:,.0f} kg) supports higher pricing")
    elif gap > 0:
        explanations.append(f"Moderate demand exceeds supply by {gap:,.0f} kg")
    else:
        explanations.append("Supply meets or exceeds demand — consider competitive pricing")

    explanations.append(
        f"Direct marketplace eliminates intermediary margins, adding value to farmer payout"
    )

    return {
        "crop": crop,
        "district": district,
        "recommended_price_per_kg": recommended,
        "price_range_min": price_min,
        "price_range_max": price_max,
        "currency": "INR",
        "explanations": explanations,
        "model_version": get_model_version(),
        "is_fallback": is_fallback,
    }


def _build_explanations(feature_row: dict, predicted_demand: float, supply: float) -> list[str]:
    """
    Build human-readable explanations from actual feature importances.
    Unlike the reference project, these are derived from the model, not hardcoded.
    """
    explanations = []
    importances = _metadata.get("demand_feature_importances", {})

    # Get top 3 most important features for this prediction
    top_features = list(importances.items())[:6]

    # Map feature names to human-readable explanations
    for feat_name, importance in top_features:
        if importance < 0.02:
            continue

        value = feature_row.get(feat_name)
        if value is None or value == 0:
            continue

        if feat_name == "previous_demand":
            explanations.append(
                f"Historical demand trend ({value:,.0f} kg) is a strong demand signal"
            )
        elif feat_name == "supply":
            gap = predicted_demand - supply
            if gap > 0:
                explanations.append(
                    f"Current supply ({supply:,.0f} kg) is {gap:,.0f} kg below predicted demand"
                )
        elif feat_name == "demand_supply_ratio":
            if value > 1.2:
                explanations.append("Demand-to-supply ratio indicates undersupply conditions")
        elif feat_name == "temperature":
            explanations.append(f"Regional temperature ({value}°C) affects crop yield and demand")
        elif feat_name == "festival":
            if value:
                explanations.append("Festival period is driving higher consumption demand")
        elif feat_name.startswith("crop_") and value == 1:
            crop = feat_name.replace("crop_", "")
            explanations.append(f"{crop} has characteristic seasonal demand patterns")
        elif feat_name.startswith("district_") and value == 1:
            district = feat_name.replace("district_", "")
            explanations.append(f"Regional demand profile for {district} factored in")

    # Ensure we have at least one explanation
    if not explanations:
        explanations.append(
            f"Model predicts {predicted_demand:,.0f} kg demand based on multi-factor analysis"
        )

    return explanations[:4]  # Cap at 4 explanations for readability
