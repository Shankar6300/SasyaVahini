"""
SasyaVahini ML — Advanced Agricultural Feature Engineering & Market Mechanics

Centralizes feature engineering, commodity economic profiles, APMC mandi distance matrices,
and price elasticity models for the SasyaVahini agricultural intelligence engine.
SIH 2026 — Ministry of Consumer Affairs, Food & Public Distribution (DoCA).
"""

import math
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


# ─── Commodity Catalog & Econometric Elasticity Baselines ────────────────────
# Agricultural demand elasticity (ε = %ΔQ / %ΔP) is characteristically inelastic (< 1.0)
# for staples, with higher elasticity for luxury fruits.
COMMODITY_PROFILES: Dict[str, dict] = {
    "Tomato": {
        "baseline_demand_kg": 16000,
        "base_modal_price": 30.0,  # Empirical Agmarknet median (Nov 2026 bulletin)
        "price_elasticity": -0.45,  # Inelastic staple with perishability vulnerability
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Onion": {
        "baseline_demand_kg": 18500,
        "base_modal_price": 54.0,  # Empirical Agmarknet median (Nov 2026 bulletin)
        "price_elasticity": -0.32,  # Highly inelastic essential staple (key DoCA monitored item)
        "perishability_days": 45,
        "perishability_tier": "LOW",
        "category": "Vegetable",
    },
    "Potato": {
        "baseline_demand_kg": 15000,
        "base_modal_price": 20.0,  # Empirical Agmarknet median (Nov 2026 bulletin)
        "price_elasticity": -0.28,  # Highly inelastic cold-storage buffer
        "perishability_days": 60,
        "perishability_tier": "LOW",
        "category": "Tuber",
    },
    "Wheat": {
        "baseline_demand_kg": 11000,
        "base_modal_price": 28.3,  # Empirical Agmarknet median (Nov 2026 bulletin, MSP-anchored)
        "price_elasticity": -0.20,  # Essential cereal
        "perishability_days": 180,
        "perishability_tier": "DRY_GRAIN",
        "category": "Grain",
    },
    "Rice": {
        "baseline_demand_kg": 12500,
        "base_modal_price": 42.0,  # Empirical Agmarknet median (Nov 2026 bulletin)
        "price_elasticity": -0.24,  # Essential cereal
        "perishability_days": 180,
        "perishability_tier": "DRY_GRAIN",
        "category": "Grain",
    },
    "Grapes": {
        "baseline_demand_kg": 6500,
        "base_modal_price": 100.0,  # Empirical Agmarknet median (Nov 2026 bulletin)
        "price_elasticity": -0.72,  # Elastic fruit (export / premium retail)
        "perishability_days": 5,
        "perishability_tier": "HIGH",
        "category": "Fruit",
    },
    "Pomegranate": {
        "baseline_demand_kg": 5200,
        "base_modal_price": 140.0,  # Empirical Agmarknet median (Nov 2026 bulletin)
        "price_elasticity": -0.65,  # Moderate fruit elasticity
        "perishability_days": 20,
        "perishability_tier": "MEDIUM",
        "category": "Fruit",
    },
    "Soybean": {
        "baseline_demand_kg": 8500,
        "base_modal_price": 44.0,
        "price_elasticity": -0.38,  # Oilseed / industrial processing
        "perishability_days": 150,
        "perishability_tier": "DRY_GRAIN",
        "category": "Oilseed",
    },
    "Maize": {
        "baseline_demand_kg": 9200,
        "base_modal_price": 25.8,  # Empirical Agmarknet median
        "price_elasticity": -0.35,  # Animal feed / starch processing
        "perishability_days": 120,
        "perishability_tier": "DRY_GRAIN",
        "category": "Grain",
    },
    "Sugarcane": {
        "baseline_demand_kg": 22000,
        "base_modal_price": 3.4,
        "price_elasticity": -0.15,  # Statutory cane pricing
        "perishability_days": 3,
        "perishability_tier": "CRITICAL",
        "category": "Commercial",
    },
    "Cotton": {
        "baseline_demand_kg": 7200,
        "base_modal_price": 88.2,  # Empirical Agmarknet median
        "price_elasticity": -0.42,  # Fiber cash crop
        "perishability_days": 240,
        "perishability_tier": "NON_PERISHABLE",
        "category": "Commercial",
    },
    "Chilli": {
        "baseline_demand_kg": 4200,
        "base_modal_price": 45.0,  # Empirical Agmarknet median
        "price_elasticity": -0.30,  # Spice essential
        "perishability_days": 12,
        "perishability_tier": "MEDIUM",
        "category": "Spice",
    },
    "Brinjal": {
        "baseline_demand_kg": 5800,
        "base_modal_price": 21.0,
        "price_elasticity": -0.50,  # High perishable vegetable
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Cauliflower": {
        "baseline_demand_kg": 6800,
        "base_modal_price": 19.5,
        "price_elasticity": -0.52,  # High perishable vegetable
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Cabbage": {
        "baseline_demand_kg": 6200,
        "base_modal_price": 16.0,
        "price_elasticity": -0.48,  # Medium perishable vegetable
        "perishability_days": 10,
        "perishability_tier": "MEDIUM",
        "category": "Vegetable",
    },
    "Banana": {
        "baseline_demand_kg": 11500,
        "base_modal_price": 48.8,  # Empirical Agmarknet median
        "price_elasticity": -0.40,  # Ubiquitous fruit
        "perishability_days": 6,
        "perishability_tier": "HIGH",
        "category": "Fruit",
    },
}

KNOWN_CROPS = list(COMMODITY_PROFILES.keys())

KNOWN_DISTRICTS = [
    "Pune", "Nashik", "Ahmednagar", "Solapur", "Nagpur",
    "Satara", "Kolhapur", "Sangli", "Jalgaon", "Aurangabad",
    "Mumbai", "Indore", "Jaipur", "Lucknow", "Delhi",
]

KNOWN_SEASONS = ["Kharif", "Rabi", "Zaid"]


# ─── APMC Road Distance Matrix (Kilometers) ──────────────────────────────────
# Connects agricultural production clusters with major terminal APMC consumption centers.
MANDI_DISTANCE_MATRIX: Dict[Tuple[str, str], float] = {
    ("Pune", "Mumbai"): 152.0,
    ("Pune", "Nashik"): 210.0,
    ("Pune", "Ahmednagar"): 120.0,
    ("Pune", "Satara"): 115.0,
    ("Pune", "Solapur"): 250.0,
    ("Pune", "Kolhapur"): 235.0,
    ("Nashik", "Mumbai"): 168.0,
    ("Nashik", "Pune"): 210.0,
    ("Nashik", "Ahmednagar"): 160.0,
    ("Nashik", "Jalgaon"): 235.0,
    ("Ahmednagar", "Pune"): 120.0,
    ("Ahmednagar", "Mumbai"): 255.0,
    ("Ahmednagar", "Nashik"): 160.0,
    ("Solapur", "Pune"): 250.0,
    ("Solapur", "Mumbai"): 395.0,
    ("Kolhapur", "Pune"): 235.0,
    ("Kolhapur", "Mumbai"): 380.0,
    ("Nagpur", "Mumbai"): 815.0,
    ("Nagpur", "Pune"): 720.0,
    ("Jalgaon", "Mumbai"): 415.0,
    ("Aurangabad", "Pune"): 235.0,
    ("Aurangabad", "Mumbai"): 335.0,
}


def get_mandi_distance(origin: str, destination: str) -> float:
    """Return highway road transit distance between two APMC districts in km."""
    if origin == destination:
        return 0.0
    return MANDI_DISTANCE_MATRIX.get((origin, destination), MANDI_DISTANCE_MATRIX.get((destination, origin), 180.0))


def compute_mandi_arbitrage(
    crop: str,
    origin_district: str,
    local_modal_price: float,
    current_supply_kg: float,
) -> dict:
    """
    Calculates whether a farmer/FPO should sell locally or dispatch produce to
    a neighboring regional consumption hub (e.g. Pune -> Vashi/Mumbai APMC).

    Accounts for commercial freight (diesel rate ₹90/L + standard truck freight ₹3.50/t-km)
    and handling charges.
    """
    profile = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES["Tomato"])
    candidate_mandis = ["Mumbai", "Pune", "Nashik", "Nagpur"]
    if origin_district in candidate_mandis:
        candidate_mandis.remove(origin_district)

    best_advisory = {
        "origin_mandi": f"{origin_district} APMC",
        "recommended_mandi": f"{origin_district} APMC",
        "origin_modal_price": round(local_modal_price, 2),
        "target_modal_price": round(local_modal_price, 2),
        "freight_cost_per_kg": 0.0,
        "net_arbitrage_gain_per_kg": 0.0,
        "distance_km": 0.0,
        "signal": "SELL_LOCAL",
    }

    best_net_gain = 0.0

    # Large consumption terminal mandis generally trade at a premium over production centers
    mandi_premium_factors = {
        "Mumbai": 1.28,  # Vashi APMC has high terminal demand & premium buyers
        "Pune": 1.15,
        "Nashik": 1.05,
        "Nagpur": 1.12,
    }

    for target in candidate_mandis:
        dist = get_mandi_distance(origin_district, target)
        if dist > 450 and profile["perishability_tier"] in ("CRITICAL", "HIGH"):
            continue  # Avoid high spoilage risk on distant routes for perishable items

        # Freight: ₹3.50 per tonne-km = ₹0.0035 per kg-km + ₹0.35/kg loading/unloading
        freight_per_kg = (dist * 0.0035) + 0.35
        expected_target_price = local_modal_price * mandi_premium_factors.get(target, 1.10)
        net_gain = expected_target_price - local_modal_price - freight_per_kg

        if net_gain > best_net_gain and net_gain >= 1.5:  # Require at least ₹1.5/kg net buffer to justify haulage
            best_net_gain = net_gain
            best_advisory = {
                "origin_mandi": f"{origin_district} APMC",
                "recommended_mandi": f"{target} APMC",
                "origin_modal_price": round(local_modal_price, 2),
                "target_modal_price": round(expected_target_price, 2),
                "freight_cost_per_kg": round(freight_per_kg, 2),
                "net_arbitrage_gain_per_kg": round(net_gain, 2),
                "distance_km": round(dist, 1),
                "signal": "STRONG_ARBITRAGE" if net_gain > 3.0 else "MODERATE_ARBITRAGE",
            }

    return best_advisory


def detect_season(month: int) -> str:
    """Infer Indian agricultural season from month number."""
    if month in (6, 7, 8, 9, 10):
        return "Kharif"
    elif month in (11, 12, 1, 2, 3):
        return "Rabi"
    else:
        return "Zaid"


def month_cyclical_features(month: int) -> dict:
    """Encode month into cyclical sin/cos coordinates."""
    angle = 2 * math.pi * (month - 1) / 12
    return {
        "month_sin": round(math.sin(angle), 6),
        "month_cos": round(math.cos(angle), 6),
    }


def build_advanced_feature_row(
    crop: str,
    district: str,
    month: Optional[int] = None,
    season: Optional[str] = None,
    festival_period: bool = False,
    previous_demand_kg: Optional[float] = None,
    current_supply_kg: Optional[float] = None,
    temperature_celsius: Optional[float] = None,
    modal_price_lag1: Optional[float] = None,
    modal_price_lag7: Optional[float] = None,
) -> dict:
    """
    Constructs a multi-dimensional agricultural feature vector aligned with
    Agmarknet / e-NAM and microeconomic price elasticity principles.
    """
    if month is None:
        month = datetime.now().month
    if season is None:
        season = detect_season(month)

    profile = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES["Tomato"])
    base_demand = profile["baseline_demand_kg"]
    base_price = profile["base_modal_price"]

    if previous_demand_kg is None:
        previous_demand_kg = float(base_demand)
    if current_supply_kg is None:
        current_supply_kg = float(base_demand * 0.95)
    if temperature_celsius is None:
        temperature_celsius = 26.0 + 8.0 * math.sin((month - 4) * math.pi / 6)
    if modal_price_lag1 is None:
        modal_price_lag1 = base_price
    if modal_price_lag7 is None:
        modal_price_lag7 = base_price * 0.98

    row = {}

    # 1. Cyclical seasonality
    row.update(month_cyclical_features(month))

    # 2. Demand, supply & volume metrics (in MT & kg)
    row["previous_demand_kg"] = float(previous_demand_kg)
    row["current_supply_kg"] = float(current_supply_kg)
    row["supply_tonnes"] = round(float(current_supply_kg) / 1000.0, 3)
    row["demand_supply_ratio"] = round(previous_demand_kg / max(1.0, current_supply_kg), 4)

    # 3. Market price dynamics & momentum (Agmarknet modal prices)
    row["modal_price_lag1"] = float(modal_price_lag1)
    row["modal_price_lag7"] = float(modal_price_lag7)
    row["price_momentum_7d"] = round((modal_price_lag1 - modal_price_lag7) / max(0.1, modal_price_lag7), 4)

    # 4. Exogenous signals (weather & festivals)
    row["festival_flag"] = 1.0 if festival_period else 0.0
    row["temperature_celsius"] = round(float(temperature_celsius), 1)

    # 5. Perishability degradation index (higher temp accelerates perishable decay velocity)
    is_perishable = 1.0 if profile["perishability_tier"] in ("CRITICAL", "HIGH") else 0.0
    row["perishability_heat_penalty"] = round(max(0.0, (temperature_celsius - 28.0)) * is_perishable, 3)

    # 6. Commodity economic parameters
    row["price_elasticity_coeff"] = profile["price_elasticity"]
    row["perishability_baseline_days"] = float(profile["perishability_days"])

    # 7. One-hot categorical encodings
    for c in KNOWN_CROPS:
        row[f"crop_{c}"] = 1.0 if c == crop else 0.0
    for d in KNOWN_DISTRICTS:
        row[f"district_{d}"] = 1.0 if d == district else 0.0
    for s in KNOWN_SEASONS:
        row[f"season_{s}"] = 1.0 if s == season else 0.0

    return row


def get_feature_column_names() -> List[str]:
    """Return sorted canonical feature column list."""
    sample = build_advanced_feature_row(crop="Tomato", district="Pune", month=6)
    return sorted(sample.keys())
