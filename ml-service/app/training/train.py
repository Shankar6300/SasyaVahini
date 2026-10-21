"""
SasyaVahini ML — Advanced Multi-Horizon Quantile Training Pipeline

Trains HistGradientBoosting models with Quantile Pinball Loss (P10, P50, P90)
to produce genuine uncertainty bands and econometrically cleared prices.
SIH 2026 — Ministry of Consumer Affairs, Food & Public Distribution (DoCA).
"""

import os
import sys

# Ensure imports work whether run as module or script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import KFold

from app.config import (
    ARTIFACTS_DIR,
    DATA_DIR,
    DEMAND_MODEL_PATH,
    DEMAND_P10_MODEL_PATH,
    DEMAND_P50_MODEL_PATH,
    DEMAND_P90_MODEL_PATH,
    FEATURE_COLUMNS_PATH,
    MODEL_METADATA_PATH,
    MODEL_VERSION,
    PRICE_MODEL_PATH,
)
from app.training.features import (
    COMMODITY_PROFILES,
    KNOWN_CROPS,
    KNOWN_DISTRICTS,
    KNOWN_SEASONS,
    build_advanced_feature_row,
    detect_season,
    get_feature_column_names,
)


def generate_advanced_agmarknet_dataset(num_samples: int = 3500) -> pd.DataFrame:
    """
    Synthesizes multi-market daily arrival and price patterns modeled directly
    on Agmarknet / e-NAM daily bulletins and microeconomic elasticity curves.
    """
    rng = np.random.default_rng(seed=42)
    rows = []

    for _ in range(num_samples):
        crop = rng.choice(KNOWN_CROPS)
        district = rng.choice(KNOWN_DISTRICTS)
        month = int(rng.integers(1, 13))
        season = detect_season(month)
        festival = bool(rng.choice([True, False], p=[0.22, 0.78]))

        profile = COMMODITY_PROFILES[crop]
        base_demand = profile["baseline_demand_kg"]
        base_price = profile["base_modal_price"]
        elasticity = profile["price_elasticity"]
        perishability_tier = profile["perishability_tier"]

        # Realistic climate variation
        temperature = 26.0 + 8.0 * np.sin((month - 4) * np.pi / 6) + rng.normal(0, 1.8)

        # Supply shock simulation (simulates agricultural arrival volatility)
        supply_shock_pct = rng.normal(0, 0.22)
        supply = max(800.0, base_demand * (1.0 + supply_shock_pct))

        # Demand lag dynamics
        prev_demand = max(1000.0, base_demand * (1.0 + rng.normal(0, 0.15)))

        # Festival lift factor
        festival_lift = (0.28 if perishability_tier in ("HIGH", "CRITICAL") else 0.16) if festival else 0.0

        # High ambient temperature increases turnover demand for perishables due to decay
        temp_penalty_demand = 0.0
        if perishability_tier in ("HIGH", "CRITICAL") and temperature > 28.0:
            temp_penalty_demand = (temperature - 28.0) * 120.0

        # Market-clearing demand target with stochastic market noise
        demand_target = (
            prev_demand * 0.45
            + (base_demand * 0.55)
            + (base_demand * festival_lift)
            + temp_penalty_demand
            + rng.normal(0, base_demand * 0.08)
        )
        demand_target = max(500.0, round(demand_target, 1))

        # Econometric price response based on demand-supply gap and price elasticity:
        # %ΔP ≈ (1 / ε) * %ΔQ_supply_shock
        gap = demand_target - supply
        gap_ratio = gap / max(1000.0, supply)
        # Price adjustments inversely proportional to elasticity |ε|
        price_delta = base_price * (gap_ratio * (0.6 / abs(elasticity)))
        modal_price = max(base_price * 0.35, base_price + price_delta + (base_price * 0.10 if festival else 0.0))
        modal_price = round(modal_price, 2)

        # Construct lag prices
        lag1_price = round(max(3.0, modal_price * (1.0 + rng.normal(0, 0.05))), 2)
        lag7_price = round(max(3.0, modal_price * (1.0 + rng.normal(0, 0.09))), 2)

        feature_row = build_advanced_feature_row(
            crop=crop,
            district=district,
            month=month,
            season=season,
            festival_period=festival,
            previous_demand_kg=prev_demand,
            current_supply_kg=supply,
            temperature_celsius=temperature,
            modal_price_lag1=lag1_price,
            modal_price_lag7=lag7_price,
        )

        # Attach target labels (separated before model training)
        feature_row["_target_demand"] = demand_target
        feature_row["_target_price"] = modal_price
        feature_row["_crop"] = crop
        feature_row["_district"] = district

        rows.append(feature_row)

    df = pd.DataFrame(rows)
    csv_path = DATA_DIR / "agmarknet_aligned_market_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"  [OK] Saved Agmarknet-aligned dataset: {csv_path.name} ({len(df)} samples)")
    return df


def pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, quantile: float) -> float:
    """Calculate quantile regression pinball loss."""
    diff = y_true - y_pred
    return float(np.mean(np.maximum(quantile * diff, (quantile - 1.0) * diff)))


def train_advanced_models(df: pd.DataFrame | None = None) -> dict:
    """
    Train 3 Multi-Quantile HistGradientBoosting models (P10, P50, P90)
    and an econometric price regression model.
    """
    print("\n" + "=" * 65)
    print("  SasyaVahini ML — Multi-Horizon Quantile Training Engine")
    print("  SIH 2026 — Ministry of Consumer Affairs (DoCA)")
    print("=" * 65)

    if df is None:
        print("\n[1/5] Synthesizing Agmarknet-aligned temporal market dynamics...")
        df = generate_advanced_agmarknet_dataset()
    else:
        print(f"\n[1/5] Ingesting provided dataset ({len(df)} records)")

    # Separate feature matrix from target vectors
    feature_cols = sorted([c for c in df.columns if not c.startswith("_")])
    X = df[feature_cols].copy()
    y_demand = df["_target_demand"].values
    y_price = df["_target_price"].values

    print(f"  Feature space: {len(feature_cols)} dimensions | Samples: {len(X)}")

    # ── Train P10 Quantile Model (Pessimistic Demand / Risk Floor) ─────────────
    print("\n[2/5] Training P10 Quantile HistGradientBoosting (loss='quantile', alpha=0.10)...")
    model_p10 = HistGradientBoostingRegressor(
        loss="quantile",
        quantile=0.10,
        max_iter=160,
        max_depth=10,
        min_samples_leaf=15,
        random_state=42,
    )
    model_p10.fit(X, y_demand)
    loss_p10 = pinball_loss(y_demand, model_p10.predict(X), 0.10)
    print(f"  [OK] P10 Model trained - Pinball Loss (alpha=0.10): {loss_p10:.2f}")

    # ── Train P50 Quantile Model (Median Market-Clearing Demand) ──────────────
    print("\n[3/5] Training P50 Quantile HistGradientBoosting (loss='quantile', alpha=0.50)...")
    model_p50 = HistGradientBoostingRegressor(
        loss="quantile",
        quantile=0.50,
        max_iter=180,
        max_depth=12,
        min_samples_leaf=12,
        random_state=42,
    )
    model_p50.fit(X, y_demand)
    loss_p50 = pinball_loss(y_demand, model_p50.predict(X), 0.50)
    print(f"  [OK] P50 Model trained - Pinball Loss (alpha=0.50): {loss_p50:.2f}")

    # ── Train P90 Quantile Model (Optimistic Demand / Surge Ceiling) ──────────
    print("\n[4/5] Training P90 Quantile HistGradientBoosting (loss='quantile', alpha=0.90)...")
    model_p90 = HistGradientBoostingRegressor(
        loss="quantile",
        quantile=0.90,
        max_iter=160,
        max_depth=10,
        min_samples_leaf=15,
        random_state=42,
    )
    model_p90.fit(X, y_demand)
    loss_p90 = pinball_loss(y_demand, model_p90.predict(X), 0.90)
    print(f"  [OK] P90 Model trained - Pinball Loss (alpha=0.90): {loss_p90:.2f}")

    # Coverage calibration: empirical fraction of points between P10 and P90
    preds_p10 = model_p10.predict(X)
    preds_p90 = model_p90.predict(X)
    coverage = float(np.mean((y_demand >= preds_p10) & (y_demand <= preds_p90)) * 100.0)
    print(f"  --> Empirical 80% Prediction Interval Coverage: {coverage:.2f}% (Target: ~80%)")

    # ── Train Econometric Price Clearing Model ───────────────────────────────
    print("\n[5/5] Training Econometric Price Clearing Model (HistGradientBoosting)...")
    price_model = HistGradientBoostingRegressor(
        loss="squared_error",
        max_iter=180,
        max_depth=10,
        min_samples_leaf=12,
        random_state=42,
    )
    price_model.fit(X, y_price)

    # Cross-validation score for price model
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    price_cv_scores = []
    for train_idx, val_idx in kf.split(X):
        price_model.fit(X.iloc[train_idx], y_price[train_idx])
        price_cv_scores.append(price_model.score(X.iloc[val_idx], y_price[val_idx]))
    price_r2 = float(np.mean(price_cv_scores))
    print(f"  [OK] Price Model CV R2: {price_r2:.4f} (+/- {np.std(price_cv_scores):.4f})")

    # Re-fit price model on full dataset
    price_model.fit(X, y_price)

    # ── Persist Artifacts ────────────────────────────────────────────────────
    print("\n--> Persisting Quantile & Price Model Artifacts...")
    joblib.dump(model_p10, DEMAND_P10_MODEL_PATH)
    print(f"  [OK] {DEMAND_P10_MODEL_PATH.name}")

    joblib.dump(model_p50, DEMAND_P50_MODEL_PATH)
    print(f"  [OK] {DEMAND_P50_MODEL_PATH.name}")

    joblib.dump(model_p90, DEMAND_P90_MODEL_PATH)
    print(f"  [OK] {DEMAND_P90_MODEL_PATH.name}")

    # Legacy alias points to median model
    joblib.dump(model_p50, DEMAND_MODEL_PATH)
    print(f"  [OK] {DEMAND_MODEL_PATH.name} (median alias)")

    joblib.dump(price_model, PRICE_MODEL_PATH)
    print(f"  [OK] {PRICE_MODEL_PATH.name}")

    joblib.dump(feature_cols, FEATURE_COLUMNS_PATH)
    print(f"  [OK] {FEATURE_COLUMNS_PATH.name}")

    metadata = {
        "model_version": MODEL_VERSION,
        "algorithm": "HistGradientBoosting Quantile Regression (P10, P50, P90)",
        "trained_at": datetime.now().isoformat(),
        "num_samples": len(X),
        "num_features": len(feature_cols),
        "coverage_80pct": round(coverage, 2),
        "pinball_loss_p10": round(loss_p10, 2),
        "pinball_loss_p50": round(loss_p50, 2),
        "pinball_loss_p90": round(loss_p90, 2),
        "price_cv_r2": round(price_r2, 4),
        "data_alignment": "Agmarknet/e-NAM multimodal schema",
    }
    joblib.dump(metadata, MODEL_METADATA_PATH)
    print(f"  [OK] {MODEL_METADATA_PATH.name}")

    print("\n" + "=" * 65)
    print("  Training Pipeline Complete! Multi-Quantile Models Deployed.")
    print("=" * 65 + "\n")
    return metadata


if __name__ == "__main__":
    train_advanced_models()
