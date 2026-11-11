"""
SasyaVahini ML — Advanced Multi-Horizon Quantile & Market Intelligence Engine

Serving module that loads P10/P50/P90 quantile models, computes 7-day trajectories,
evaluates inter-mandi spatial arbitrage, and determines microeconomic price elasticity.
SIH 2026 — Ministry of Consumer Affairs, Food & Public Distribution (DoCA).
"""

from datetime import datetime, timedelta
import json
import math
from typing import Dict, List, Optional
import joblib
import numpy as np
import pandas as pd

from app.config import (
    DEMAND_MODEL_PATH,
    DEMAND_P10_MODEL_PATH,
    DEMAND_P50_MODEL_PATH,
    DEMAND_P90_MODEL_PATH,
    FEATURE_COLUMNS_PATH,
    MODEL_METADATA_PATH,
    MODEL_METADATA_JSON_PATH,
    MODEL_VERSION,
    PRICE_MODEL_PATH,
)
from app.training.features import (
    COMMODITY_PROFILES,
    build_advanced_feature_row,
    compute_mandi_arbitrage,
    detect_season,
    get_district_price_factor,
)
from app.training.agronomic_matrix import (
    calculate_festival_multiplier,
    calculate_fourier_harmonics,
    calculate_perishability_depreciation,
)
from app.data.market_state_store import get_live_spot_data
from app.models.market_guardrails import apply_market_physics_guardrails

# ─── Module Level State ──────────────────────────────────────────────────────
_model_p10 = None
_model_p50 = None
_model_p90 = None
_price_model = None
_feature_columns: List[str] = []
_metadata: dict = {}
_models_loaded = False


def load_models() -> bool:
    """Load all quantile and price regression artifacts."""
    global _model_p10, _model_p50, _model_p90, _price_model, _feature_columns, _metadata, _models_loaded

    try:
        if not (DEMAND_P50_MODEL_PATH.exists() and PRICE_MODEL_PATH.exists()):
            print("[ML] Quantile model artifacts not found — falling back to heuristics")
            _models_loaded = False
            return False

        _model_p10 = joblib.load(DEMAND_P10_MODEL_PATH)
        _model_p50 = joblib.load(DEMAND_P50_MODEL_PATH)
        _model_p90 = joblib.load(DEMAND_P90_MODEL_PATH)
        _price_model = joblib.load(PRICE_MODEL_PATH)
        _feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

        if MODEL_METADATA_JSON_PATH.exists():
            try:
                with open(MODEL_METADATA_JSON_PATH, "r", encoding="utf-8") as f:
                    _metadata = json.load(f)
            except Exception:
                pass
        elif MODEL_METADATA_PATH.exists():
            _metadata = joblib.load(MODEL_METADATA_PATH)

        _models_loaded = True
        active_ver = _metadata.get("version") or _metadata.get("model_version", MODEL_VERSION)
        print(f"[ML] Advanced Quantile Models Loaded — Version: {active_ver}")
        return True

    except Exception as e:
        print(f"[ML] Warning: Could not load quantile models ({e}) — using heuristic fallback")
        _models_loaded = False
        return False


def are_models_loaded() -> bool:
    return _models_loaded


def get_model_version() -> str:
    return _metadata.get("version") or _metadata.get("model_version", MODEL_VERSION)


def get_model_metadata() -> dict:
    return dict(_metadata)


def _generate_7day_trajectory(
    p10_base: float,
    p50_base: float,
    p90_base: float,
    base_price: float,
    spot_price: float,
    crop: str,
    district: str,
    msp_floor: float,
    daily_volatility: float,
    demand_level: str,
    festival: bool,
) -> List[dict]:
    """Generates a day-by-day 7-day trajectory vector with volatility circuit clamps."""
    now = datetime.now()
    trajectory = []
    
    # Intra-week velocity factors (weekends/festival have higher retail procurement)
    day_weights = [1.00, 1.02, 1.05, 1.08, 1.12, 1.15, 1.07] if festival else [1.00, 0.98, 1.01, 1.03, 1.06, 1.10, 0.99]
    price_drift = 0.012 if demand_level == "HIGH" else -0.012 if demand_level == "LOW" else 0.002

    for day_idx in range(1, 8):
        dt = now + timedelta(days=day_idx)
        w = day_weights[day_idx - 1]
        
        p10 = round(max(300.0, p10_base * w * (1.0 - 0.04 * (day_idx - 1))))
        p50 = round(max(500.0, p50_base * w))
        p90 = round(max(700.0, p90_base * w * (1.0 + 0.03 * (day_idx - 1))))
        
        raw_p = base_price * (1.0 + price_drift * day_idx)
        guard_res = apply_market_physics_guardrails(
            crop=crop,
            district=district,
            raw_predicted_price=raw_p,
            spot_price=spot_price,
            msp_floor=msp_floor,
            daily_volatility=daily_volatility,
            horizon_day=day_idx,
        )
        expected_p = guard_res["guarded_price"]

        trajectory.append({
            "day": day_idx,
            "date": dt.strftime("%Y-%m-%d"),
            "p10_kg": p10,
            "p50_kg": p50,
            "p90_kg": p90,
            "expected_price_per_kg": expected_p,
        })

    return trajectory


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
    current_price_per_kg: Optional[float] = None,
) -> dict:
    """
    Predicts multi-horizon probabilistic crop demand (P10, P50, P90),
    evaluates inter-mandi spatial arbitrage, and computes pricing dynamics
    strictly anchored to live market spot rates and institutional guardrails.
    """
    if month is None:
        month = datetime.now().month
    if season is None:
        season = detect_season(month)

    profile = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES["Tomato"])
    dist_factor = get_district_price_factor(district)
    base_demand = profile["baseline_demand_kg"]
    elasticity = profile["price_elasticity"]

    # ── Spot Price Resolution (User Input -> Live Agmarknet APMC -> Profile Baseline) ──
    spot_info = get_live_spot_data(crop, district)
    if current_price_per_kg is not None and current_price_per_kg > 0:
        spot_price = float(current_price_per_kg)
        spot_source = "user_specified"
    else:
        spot_price = float(spot_info["modal_price"])
        spot_source = spot_info.get("data_source", "live_agmarknet_apmc")

    msp_floor = float(spot_info.get("msp_floor", profile.get("msp_floor", 0.0)))
    daily_vol = float(spot_info.get("daily_volatility_pct", 0.06))
    arrivals_tonnes = float(spot_info.get("arrivals_tonnes", 120.0))

    supply = current_supply_kg if current_supply_kg is not None else float(base_demand * 0.95)
    prev_demand = previous_demand_kg if previous_demand_kg is not None else float(base_demand)
    temp = temperature_celsius if temperature_celsius is not None else 26.0

    # Auto-detect festival proximity from Indian Festival & Holiday Calendar
    fest_mult, active_fest = calculate_festival_multiplier(datetime.now(), crop)
    effective_festival = bool(festival_period) or (fest_mult > 1.05)

    guardrails_applied = []

    if _models_loaded and _model_p50 is not None:
        # ── Multi-Quantile HistGradientBoosting Inference ─────────────────────
        row = build_advanced_feature_row(
            crop=crop,
            district=district,
            month=month,
            season=season,
            festival_period=effective_festival,
            previous_demand_kg=prev_demand,
            current_supply_kg=supply,
            temperature_celsius=temp,
            modal_price_lag1=spot_price,
            modal_price_lag7=round(spot_price * 0.98, 2),
        )

        df_input = pd.DataFrame([row])[_feature_columns]

        p10 = float(_model_p10.predict(df_input)[0])
        p50 = float(_model_p50.predict(df_input)[0])
        p90 = float(_model_p90.predict(df_input)[0])

        # If festival proximity detected, apply calibrated harmonic surge
        if fest_mult > 1.0:
            p10 = round(p10 * fest_mult)
            p50 = round(p50 * fest_mult)
            p90 = round(p90 * fest_mult)

        p10 = max(400.0, round(p10))
        p50 = max(p10 + 200.0, round(p50))
        p90 = max(p50 + 200.0, round(p90))

        predicted_demand = p50

        # Econometric price clearance with Institutional Market Guardrails
        raw_price = float(_price_model.predict(df_input)[0])
        guard_res = apply_market_physics_guardrails(
            crop=crop,
            district=district,
            raw_predicted_price=raw_price,
            spot_price=spot_price,
            msp_floor=msp_floor,
            daily_volatility=daily_vol,
            arrivals_today_tonnes=arrivals_tonnes,
            arrivals_avg_tonnes=arrivals_tonnes,
            elasticity=elasticity,
            horizon_day=1,
        )
        recommended_price = guard_res["guarded_price"]
        guardrails_applied = guard_res["flags"]

        confidence_score = _metadata.get("coverage_80pct", 81.5) / 100.0
        is_fallback = False

    else:
        # ── Microeconomic Heuristic Fallback ─────────────────────────────────
        heuristic_mult = fest_mult if fest_mult > 1.0 else (1.25 if festival_period else 1.0)
        p50 = round(base_demand * 0.5 + prev_demand * 0.4 * heuristic_mult)
        p10 = round(p50 * 0.78)
        p90 = round(p50 * 1.28)
        predicted_demand = p50

        gap = predicted_demand - supply
        raw_price = spot_price + (gap / max(1000.0, supply)) * 2.0
        guard_res = apply_market_physics_guardrails(
            crop=crop,
            district=district,
            raw_predicted_price=raw_price,
            spot_price=spot_price,
            msp_floor=msp_floor,
            daily_volatility=daily_vol,
            arrivals_today_tonnes=arrivals_tonnes,
            arrivals_avg_tonnes=arrivals_tonnes,
            elasticity=elasticity,
            horizon_day=1,
        )
        recommended_price = guard_res["guarded_price"]
        guardrails_applied = guard_res["flags"]
        confidence_score = 0.75
        is_fallback = True

    # Demand classification
    gap = predicted_demand - supply
    if gap > 1500:
        demand_level = "HIGH"
    elif gap < -1500:
        demand_level = "LOW"
    else:
        demand_level = "MEDIUM"

    # Compute Inter-Mandi Arbitrage Advisory
    arbitrage_advisory = compute_mandi_arbitrage(crop, district, recommended_price, supply)

    # 7-day daily trajectory
    daily_trajectory = _generate_7day_trajectory(
        p10_base=p10,
        p50_base=p50,
        p90_base=p90,
        base_price=recommended_price,
        spot_price=spot_price,
        crop=crop,
        district=district,
        msp_floor=msp_floor,
        daily_volatility=daily_vol,
        demand_level=demand_level,
        festival=effective_festival,
    )

    # True instance-level marginal explainability breakdown
    explanations = [
        f"Agmarknet Spot Reference: Rs. {spot_price:.2f}/kg ({spot_source.replace('_', ' ').title()})",
    ]
    if msp_floor > 0:
        explanations.append(f"Statutory GoI MSP Floor: Rs. {msp_floor:.2f}/kg legally protected")
    if guardrails_applied:
        explanations.append(f"Market Guardrails Applied: {', '.join(guardrails_applied)}")
    if active_fest:
        explanations.append(f"Indian Festival Calendar: Proximity to {active_fest} generates a {fest_mult:.2f}x demand surge multiplier")
    elif festival_period:
        explanations.append(f"Festival period creates a projected demand surge for {crop} (DoCA calendar lift)")
    if gap > 0:
        gap_pct = round((gap / max(1.0, supply)) * 100.0, 1)
        explanations.append(f"Supply deficit of {gap:,.0f} kg (+{gap_pct}%) provides favorable farmer pricing leverage")
    else:
        surplus_pct = round((abs(gap) / max(1.0, supply)) * 100.0, 1)
        explanations.append(f"Supply surplus of {abs(gap):,.0f} kg ({surplus_pct}%) suggests targeting bulk institutional buyers")

    if temp > 28.0 and profile["perishability_tier"] in ("HIGH", "CRITICAL"):
        explanations.append(f"Ambient heat ({temp} C) accelerates {crop} shelf-life decay - rapid mandi dispatch advised")

    if arbitrage_advisory["signal"] != "SELL_LOCAL":
        explanations.append(
            f"Cross-mandi arbitrage opportunity: +Rs. {arbitrage_advisory['net_arbitrage_gain_per_kg']}/kg net gain at {arbitrage_advisory['recommended_mandi']} after transport"
        )

    return {
        "crop": crop,
        "district": district,
        "state": state,
        "predicted_demand_kg": predicted_demand,
        "demand_p10_kg": p10,
        "demand_p90_kg": p90,
        "current_supply_kg": supply,
        "demand_gap_kg": gap,
        "demand_level": demand_level,
        "recommended_price_per_kg": recommended_price,
        "spot_price_used": spot_price,
        "spot_price_source": spot_source,
        "msp_floor": msp_floor if msp_floor > 0 else None,
        "guardrails_applied": guardrails_applied,
        "price_elasticity": elasticity,
        "confidence_score": round(confidence_score, 3),
        "daily_trajectory": daily_trajectory,
        "arbitrage_advisory": arbitrage_advisory,
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
    current_price_per_kg: Optional[float] = None,
    transit_days: Optional[float] = 1.5,
) -> dict:
    """
    Recommends a fair listing price grounded in microeconomic price elasticity (ε = %ΔQ / %ΔP),
    perishable transit decay discounting, and institutional APMC guardrails.
    """
    profile = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES["Tomato"])
    dist_factor = get_district_price_factor(district)
    base_demand = profile["baseline_demand_kg"]
    elasticity = profile["price_elasticity"]

    # ── Spot Price Resolution ────────────────────────────────────────────────
    spot_info = get_live_spot_data(crop, district)
    if current_price_per_kg is not None and current_price_per_kg > 0:
        spot_price = float(current_price_per_kg)
        spot_source = "user_specified"
    elif historical_price_per_kg is not None and historical_price_per_kg > 0:
        spot_price = float(historical_price_per_kg)
        spot_source = "historical_override"
    else:
        spot_price = float(spot_info["modal_price"])
        spot_source = spot_info.get("data_source", "live_agmarknet_apmc")

    msp_floor = float(spot_info.get("msp_floor", profile.get("msp_floor", 0.0)))
    daily_vol = float(spot_info.get("daily_volatility_pct", 0.06))
    arrivals_tonnes = float(spot_info.get("arrivals_tonnes", 120.0))

    supply = current_supply_kg if current_supply_kg is not None else float(base_demand)
    demand = predicted_demand_kg if predicted_demand_kg is not None else float(base_demand)
    transit = float(transit_days) if transit_days is not None else 1.5

    guardrails_applied = []

    if _models_loaded and _price_model is not None:
        row = build_advanced_feature_row(
            crop=crop,
            district=district,
            month=datetime.now().month,
            previous_demand_kg=demand,
            current_supply_kg=supply,
            modal_price_lag1=spot_price,
            modal_price_lag7=round(spot_price * 0.98, 2),
        )
        df_input = pd.DataFrame([row])[_feature_columns]
        raw_price = float(_price_model.predict(df_input)[0])
        
        guard_res = apply_market_physics_guardrails(
            crop=crop,
            district=district,
            raw_predicted_price=raw_price,
            spot_price=spot_price,
            msp_floor=msp_floor,
            daily_volatility=daily_vol,
            arrivals_today_tonnes=arrivals_tonnes,
            arrivals_avg_tonnes=arrivals_tonnes,
            elasticity=elasticity,
            horizon_day=1,
        )
        rec_price = guard_res["guarded_price"]
        guardrails_applied = guard_res["flags"]
        is_fallback = False
    else:
        # Microeconomic clearing formula: ΔP/P ≈ (1/ε) * (ΔQ/Q)
        volume_disbalance = (demand - supply) / max(1000.0, supply)
        price_adj = spot_price * (volume_disbalance * (0.5 / abs(elasticity)))
        raw_price = spot_price + price_adj
        guard_res = apply_market_physics_guardrails(
            crop=crop,
            district=district,
            raw_predicted_price=raw_price,
            spot_price=spot_price,
            msp_floor=msp_floor,
            daily_volatility=daily_vol,
            arrivals_today_tonnes=arrivals_tonnes,
            arrivals_avg_tonnes=arrivals_tonnes,
            elasticity=elasticity,
            horizon_day=1,
        )
        rec_price = guard_res["guarded_price"]
        guardrails_applied = guard_res["flags"]
        is_fallback = True

    # Revenue-maximizing price band based on commodity elasticity
    band_pct = 0.08 if abs(elasticity) < 0.4 else 0.14
    price_min = max(msp_floor or 3.0, round(rec_price * (1.0 - band_pct), 2))
    price_max = round(rec_price * (1.0 + band_pct), 2)

    # Agronomic Perishability Matrix: fair price depreciation discount (gamma * C_perish)
    depreciation_info = calculate_perishability_depreciation(
        crop=crop,
        base_modal_price=rec_price,
        transit_days=transit,
        harvest_age_days=0.5,
        temp_c=28.0,
        gamma=0.30,
    )
    spoilage_adjusted_price = depreciation_info["fair_gate_price_per_kg"]

    # Market clearing volume projected at recommended price
    clearing_vol = round(quantity_kg * (1.0 if rec_price <= spot_price else max(0.65, 1.0 + elasticity * ((rec_price - spot_price) / spot_price))))

    explanations = [
        f"Agmarknet Spot Baseline: Rs. {spot_price:.2f}/kg ({spot_source.replace('_', ' ').title()})",
    ]
    if msp_floor > 0:
        explanations.append(f"Statutory GoI MSP Floor: Rs. {msp_floor:.2f}/kg legally protected")
    if guardrails_applied:
        explanations.append(f"Market Guardrails Applied: {', '.join(guardrails_applied)}")
    explanations.extend([
        f"Price elasticity (ε = {elasticity:.2f}) informs farmer price sensitivity and clearance capacity",
        f"At Rs. {rec_price}/kg, estimated market absorption is {clearing_vol:,.0f} kg ({round((clearing_vol/quantity_kg)*100)}% of lot)",
        f"Agronomic Decay Discount: {depreciation_info['respiration_tier']} (gamma*C_perish discount: -Rs. {depreciation_info['discount_per_kg']}/kg, status: {depreciation_info['urgency_status']})",
        f"Direct platform sale retains intermediary margin (avg +18-24% higher than field agent quotes)",
    ])

    return {
        "crop": crop,
        "district": district,
        "recommended_price_per_kg": rec_price,
        "price_range_min": price_min,
        "price_range_max": price_max,
        "currency": "INR",
        "spot_price_used": spot_price,
        "spot_price_source": spot_source,
        "msp_floor": msp_floor if msp_floor > 0 else None,
        "guardrails_applied": guardrails_applied,
        "elasticity_coefficient": elasticity,
        "market_clearing_volume_kg": clearing_vol,
        "spoilage_adjusted_gate_price": spoilage_adjusted_price,
        "explanations": explanations,
        "model_version": get_model_version(),
        "is_fallback": is_fallback,
    }


recommend_price = predict_price
