"""
SasyaVahini ML — Training Pipeline

Generates synthetic training data (until real datasets are available),
trains RandomForest models for demand prediction and price recommendation,
evaluates them, and persists artifacts.

Usage:
    python -m app.training.train          (from ml-service/ directory)
    python ml-service/app/training/train.py  (from project root)
"""

import os
import sys

# Ensure imports work whether run as module or script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import json
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score

from app.config import (
    ARTIFACTS_DIR,
    DATA_DIR,
    DEMAND_MODEL_PATH,
    FEATURE_COLUMNS_PATH,
    MODEL_METADATA_PATH,
    MODEL_VERSION,
    PRICE_MODEL_PATH,
)
from app.training.features import (
    KNOWN_CROPS,
    KNOWN_DISTRICTS,
    KNOWN_SEASONS,
    build_feature_row,
    detect_season,
    get_feature_column_names,
)


def generate_synthetic_dataset(num_samples: int = 2000) -> pd.DataFrame:
    """
    Generate realistic synthetic agricultural demand data.

    This is a bootstrapping dataset for demonstration and development.
    The formulas encode reasonable agricultural heuristics:
      - Perishable crops (Tomato, Onion) have higher base demand
      - Festival periods spike demand
      - Supply gaps drive prices up
      - Temperature affects perishable crop yields

    NOTE: This function will be replaced when real Agmarknet/e-NAM
    datasets are integrated.  Clearly labeled as synthetic data.
    """
    rng = np.random.default_rng(seed=42)

    # Crop-specific demand baselines (kg per district per month)
    crop_demand_baselines = {
        "Tomato": 16000, "Onion": 18000, "Potato": 14000,
        "Wheat": 10000, "Rice": 12000, "Grapes": 6000,
        "Pomegranate": 5000, "Soybean": 8000, "Maize": 9000,
        "Sugarcane": 20000, "Cotton": 7000, "Chilli": 4000,
        "Brinjal": 5500, "Cauliflower": 6500, "Cabbage": 6000,
        "Banana": 11000,
    }

    # Crop-specific base prices (₹/kg)
    crop_base_prices = {
        "Tomato": 25, "Onion": 22, "Potato": 18, "Wheat": 28,
        "Rice": 35, "Grapes": 55, "Pomegranate": 80, "Soybean": 42,
        "Maize": 20, "Sugarcane": 3, "Cotton": 60, "Chilli": 45,
        "Brinjal": 20, "Cauliflower": 18, "Cabbage": 15, "Banana": 30,
    }

    rows = []
    for _ in range(num_samples):
        crop = rng.choice(KNOWN_CROPS)
        district = rng.choice(KNOWN_DISTRICTS)
        month = rng.integers(1, 13)
        season = detect_season(month)
        festival = rng.choice([True, False], p=[0.20, 0.80])

        base_demand = crop_demand_baselines.get(crop, 10000)
        temperature = 26 + 8 * np.sin((month - 4) * np.pi / 6) + rng.normal(0, 2)

        # Supply: correlated with demand but with seasonal noise
        supply = base_demand + rng.normal(-2000, 3000)
        supply = max(1000, supply)

        # Previous demand: lagged version with some noise
        prev_demand = base_demand + rng.normal(0, 2500)
        prev_demand = max(2000, prev_demand)

        # Target: demand influenced by supply gap, season, festival, temperature
        demand = (
            prev_demand * 0.35
            + (base_demand - supply * 0.6) * 0.25
            + festival * 3500
            + rng.normal(0, 1200)
        )

        # Temperature penalty for perishable crops (higher temp → more spoilage → more demand to compensate)
        if crop in ("Tomato", "Onion", "Grapes", "Banana", "Cauliflower"):
            demand += max(0, (temperature - 30)) * 200

        demand = max(2000, round(demand))

        # Price: driven by demand-supply gap
        gap = demand - supply
        base_price = crop_base_prices.get(crop, 25)
        price = base_price + (gap / 1500) * 2.0 + festival * 3.0 + rng.normal(0, 2)
        price = max(5.0, round(price, 2))

        # Build feature row using the shared feature engineering module
        feature_row = build_feature_row(
            crop=crop,
            district=district,
            month=month,
            season=season,
            festival_period=festival,
            previous_demand_kg=prev_demand,
            current_supply_kg=supply,
            temperature_celsius=temperature,
        )

        # Attach target variables (not features — will be separated before training)
        feature_row["_target_demand"] = demand
        feature_row["_target_price"] = price
        feature_row["_crop_name"] = crop
        feature_row["_district_name"] = district
        feature_row["_state_name"] = "Maharashtra"  # Synthetic data scoped to Maharashtra

        rows.append(feature_row)

    df = pd.DataFrame(rows)

    # Save synthetic dataset for inspection/debugging
    csv_path = DATA_DIR / "synthetic_crop_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"  Synthetic dataset saved: {csv_path}  ({len(df)} samples)")

    return df


def train_models(df: pd.DataFrame | None = None):
    """
    Train demand and price prediction models.

    If no DataFrame is provided, generates a synthetic dataset.
    Models are saved as joblib artifacts along with feature column metadata.
    """
    print("\n" + "=" * 60)
    print("  SasyaVahini ML — Training Pipeline")
    print("=" * 60)

    if df is None:
        print("\n[1/4] Generating synthetic training data...")
        df = generate_synthetic_dataset()
    else:
        print(f"\n[1/4] Using provided dataset ({len(df)} samples)")

    # ── Separate features from targets ───────────────────────────────────
    target_cols = [c for c in df.columns if c.startswith("_")]
    feature_cols = sorted([c for c in df.columns if not c.startswith("_")])

    X = df[feature_cols].copy()
    y_demand = df["_target_demand"].copy()
    y_price = df["_target_price"].copy()

    print(f"  Features: {len(feature_cols)} columns")
    print(f"  Samples:  {len(X)}")

    # ── Train demand model ───────────────────────────────────────────────
    print("\n[2/4] Training demand prediction model (RandomForest)...")
    demand_model = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    demand_model.fit(X, y_demand)

    # Cross-validation for honest confidence estimation
    demand_cv_scores = cross_val_score(
        demand_model, X, y_demand, cv=5, scoring="r2"
    )
    demand_r2 = float(np.mean(demand_cv_scores))
    print(f"  Demand model CV R² = {demand_r2:.4f} (±{np.std(demand_cv_scores):.4f})")

    # ── Train price model ────────────────────────────────────────────────
    print("\n[3/4] Training price recommendation model (RandomForest)...")
    price_model = RandomForestRegressor(
        n_estimators=150,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    price_model.fit(X, y_price)

    price_cv_scores = cross_val_score(
        price_model, X, y_price, cv=5, scoring="r2"
    )
    price_r2 = float(np.mean(price_cv_scores))
    print(f"  Price model CV R²  = {price_r2:.4f} (±{np.std(price_cv_scores):.4f})")

    # ── Feature importances (for explainability) ─────────────────────────
    demand_importances = dict(
        sorted(
            zip(feature_cols, demand_model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
    )

    # ── Save artifacts ───────────────────────────────────────────────────
    print("\n[4/4] Saving trained model artifacts...")

    joblib.dump(demand_model, DEMAND_MODEL_PATH)
    print(f"  ✓ {DEMAND_MODEL_PATH.name}")

    joblib.dump(price_model, PRICE_MODEL_PATH)
    print(f"  ✓ {PRICE_MODEL_PATH.name}")

    joblib.dump(feature_cols, FEATURE_COLUMNS_PATH)
    print(f"  ✓ {FEATURE_COLUMNS_PATH.name}")

    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now().isoformat(),
        "num_samples": len(X),
        "num_features": len(feature_cols),
        "demand_cv_r2": demand_r2,
        "price_cv_r2": price_r2,
        "demand_feature_importances": demand_importances,
        "data_source": "synthetic",
    }
    joblib.dump(metadata, MODEL_METADATA_PATH)
    print(f"  ✓ {MODEL_METADATA_PATH.name}")

    print("\n" + "=" * 60)
    print("  Training complete!")
    print("=" * 60 + "\n")

    return metadata


if __name__ == "__main__":
    train_models()
