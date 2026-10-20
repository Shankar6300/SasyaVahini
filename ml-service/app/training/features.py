"""
SasyaVahini ML — Feature Engineering

Centralizes all feature construction so the training pipeline and the
serving layer compute identical features. This is the single source of
truth for what goes into the model.

Design note:
  - Features are deliberately simple for the initial synthetic-data version.
  - When real Agmarknet/e-NAM data arrives, we add temporal lag features,
    rolling averages, and external signals here — without touching serving code.
"""

import math
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd


# ── Crop and location catalogs ───────────────────────────────────────────────
# These define the one-hot encoding space. They're kept explicit so the model's
# feature vector size is deterministic and new values are handled gracefully.

KNOWN_CROPS = [
    "Tomato", "Onion", "Potato", "Wheat", "Rice", "Grapes",
    "Pomegranate", "Soybean", "Maize", "Sugarcane", "Cotton",
    "Chilli", "Brinjal", "Cauliflower", "Cabbage", "Banana",
]

KNOWN_DISTRICTS = [
    "Pune", "Nashik", "Nagpur", "Solapur", "Aurangabad",
    "Kolhapur", "Satara", "Sangli", "Ahmednagar", "Jalgaon",
    "Indore", "Bhopal", "Jaipur", "Lucknow", "Patna",
]

KNOWN_SEASONS = ["Kharif", "Rabi", "Zaid"]


def detect_season(month: int) -> str:
    """Infer Indian agricultural season from month number."""
    if month in (6, 7, 8, 9, 10):
        return "Kharif"
    elif month in (11, 12, 1, 2, 3):
        return "Rabi"
    else:
        return "Zaid"


def month_cyclical_features(month: int) -> dict:
    """
    Encode month as sin/cos pair so January and December are numerically
    close. This avoids the artificial boundary that raw month numbers create.
    """
    angle = 2 * math.pi * (month - 1) / 12
    return {
        "month_sin": round(math.sin(angle), 6),
        "month_cos": round(math.cos(angle), 6),
    }


def build_feature_row(
    crop: str,
    district: str,
    month: Optional[int] = None,
    season: Optional[str] = None,
    festival_period: bool = False,
    previous_demand_kg: Optional[float] = None,
    current_supply_kg: Optional[float] = None,
    temperature_celsius: Optional[float] = None,
) -> dict:
    """
    Build a single feature dictionary from raw inputs.

    This is the canonical way to construct model input, used by both
    the training pipeline and the prediction endpoint.

    Returns a flat dict suitable for `pd.DataFrame([row])`.
    """
    # Default month to current if not provided
    if month is None:
        month = datetime.now().month

    # Auto-detect season
    if season is None:
        season = detect_season(month)

    # Reasonable defaults for optional numeric features
    if previous_demand_kg is None:
        previous_demand_kg = 12000.0
    if current_supply_kg is None:
        current_supply_kg = 10000.0
    if temperature_celsius is None:
        # Rough sinusoidal temperature model for central India
        temperature_celsius = 26.0 + 8.0 * math.sin((month - 4) * math.pi / 6)

    # ── Start building the feature dict ──────────────────────────────────
    row = {}

    # Cyclical month encoding
    row.update(month_cyclical_features(month))

    # Numeric features
    row["festival"] = 1 if festival_period else 0
    row["previous_demand"] = float(previous_demand_kg)
    row["supply"] = float(current_supply_kg)
    row["temperature"] = round(float(temperature_celsius), 1)

    # Demand-supply ratio (guards against division by zero)
    if current_supply_kg > 0:
        row["demand_supply_ratio"] = round(previous_demand_kg / current_supply_kg, 4)
    else:
        row["demand_supply_ratio"] = 2.0  # high demand signal

    # One-hot: crop
    for c in KNOWN_CROPS:
        row[f"crop_{c}"] = 1 if c == crop else 0

    # One-hot: district
    for d in KNOWN_DISTRICTS:
        row[f"district_{d}"] = 1 if d == district else 0

    # One-hot: season
    for s in KNOWN_SEASONS:
        row[f"season_{s}"] = 1 if s == season else 0

    return row


def build_feature_dataframe(rows: list[dict]) -> pd.DataFrame:
    """Convert a list of feature-row dicts into a DataFrame with consistent column order."""
    df = pd.DataFrame(rows)
    # Sort columns for deterministic ordering
    df = df.reindex(sorted(df.columns), axis=1)
    return df


def get_feature_column_names() -> list[str]:
    """
    Return the canonical sorted list of feature column names.
    Used to verify that training and inference use the same feature space.
    """
    sample = build_feature_row(crop="Tomato", district="Pune", month=6)
    return sorted(sample.keys())
