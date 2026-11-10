"""
SasyaVahini ML — Advanced Agricultural Feature Engineering & Market Mechanics v4.0

Centralizes feature engineering, 24-commodity econometric profiles, multi-state APMC mandi
distance matrices, price elasticity models, Fourier seasonal harmonics, and weather stress indices.
SIH 2026 / Capstone — Ministry of Consumer Affairs, Food & Public Distribution (DoCA).
"""

import math
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.training.agronomic_matrix import (
    calculate_festival_multiplier,
    calculate_fourier_harmonics,
    calculate_perishability_depreciation,
)


# ─── Commodity Catalog & Econometric Elasticity Baselines (24 Commodities) ───
# Agricultural demand elasticity (ε = %ΔQ / %ΔP) is characteristically inelastic (< 1.0)
# for staples, with higher elasticity for luxury fruits.
# Base modal prices are calibrated directly to empirical Agmarknet 2026 wholesale bulletins.
COMMODITY_PROFILES: Dict[str, dict] = {
    # ── Vegetables & Tubers ──────────────────────────────────────────────────
    "Tomato": {
        "baseline_demand_kg": 16000,
        "base_modal_price": 30.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.45,
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Onion": {
        "baseline_demand_kg": 18500,
        "base_modal_price": 54.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.32,
        "perishability_days": 45,
        "perishability_tier": "MEDIUM",
        "category": "Vegetable",
    },
    "Potato": {
        "baseline_demand_kg": 15000,
        "base_modal_price": 21.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.28,
        "perishability_days": 60,
        "perishability_tier": "LOW",
        "category": "Tuber",
    },
    "Brinjal": {
        "baseline_demand_kg": 6000,
        "base_modal_price": 22.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.50,
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Cauliflower": {
        "baseline_demand_kg": 6800,
        "base_modal_price": 20.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.52,
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Cabbage": {
        "baseline_demand_kg": 6500,
        "base_modal_price": 16.5,
        "msp_floor": 0.0,
        "price_elasticity": -0.48,
        "perishability_days": 10,
        "perishability_tier": "MEDIUM",
        "category": "Vegetable",
    },
    "Capsicum": {
        "baseline_demand_kg": 5000,
        "base_modal_price": 46.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.55,
        "perishability_days": 8,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },
    "Cucumber": {
        "baseline_demand_kg": 7500,
        "base_modal_price": 22.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.50,
        "perishability_days": 6,
        "perishability_tier": "HIGH",
        "category": "Vegetable",
    },

    # ── Cereals & Grains ─────────────────────────────────────────────────────
    "Wheat": {
        "baseline_demand_kg": 12000,
        "base_modal_price": 28.5,
        "msp_floor": 22.75,
        "price_elasticity": -0.20,
        "perishability_days": 365,
        "perishability_tier": "DRY_GRAIN",
        "category": "Grain",
    },
    "Rice": {
        "baseline_demand_kg": 13000,
        "base_modal_price": 45.0,
        "msp_floor": 23.00,
        "price_elasticity": -0.24,
        "perishability_days": 365,
        "perishability_tier": "DRY_GRAIN",
        "category": "Grain",
    },
    "Maize": {
        "baseline_demand_kg": 9500,
        "base_modal_price": 26.0,
        "msp_floor": 22.25,
        "price_elasticity": -0.35,
        "perishability_days": 120,
        "perishability_tier": "DRY_GRAIN",
        "category": "Grain",
    },

    # ── Oilseeds & Commercial / Cash Crops ────────────────────────────────────
    "Soybean": {
        "baseline_demand_kg": 8500,
        "base_modal_price": 45.0,
        "msp_floor": 48.92,
        "price_elasticity": -0.38,
        "perishability_days": 150,
        "perishability_tier": "DRY_GRAIN",
        "category": "Oilseed",
    },
    "Cotton": {
        "baseline_demand_kg": 7200,
        "base_modal_price": 88.0,
        "msp_floor": 75.21,
        "price_elasticity": -0.42,
        "perishability_days": 240,
        "perishability_tier": "NON_PERISHABLE",
        "category": "Commercial",
    },
    "Sugarcane": {
        "baseline_demand_kg": 25000,
        "base_modal_price": 3.8,
        "msp_floor": 3.40,
        "price_elasticity": -0.15,
        "perishability_days": 3,
        "perishability_tier": "CRITICAL",
        "category": "Commercial",
    },

    # ── Fruits ───────────────────────────────────────────────────────────────
    "Banana": {
        "baseline_demand_kg": 12000,
        "base_modal_price": 48.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.40,
        "perishability_days": 6,
        "perishability_tier": "HIGH",
        "category": "Fruit",
    },
    "Grapes": {
        "baseline_demand_kg": 6500,
        "base_modal_price": 105.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.72,
        "perishability_days": 5,
        "perishability_tier": "HIGH",
        "category": "Fruit",
    },
    "Pomegranate": {
        "baseline_demand_kg": 5500,
        "base_modal_price": 140.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.65,
        "perishability_days": 20,
        "perishability_tier": "MEDIUM",
        "category": "Fruit",
    },
    "Mango": {
        "baseline_demand_kg": 7000,
        "base_modal_price": 120.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.68,
        "perishability_days": 8,
        "perishability_tier": "HIGH",
        "category": "Fruit",
    },
    "Papaya": {
        "baseline_demand_kg": 8000,
        "base_modal_price": 26.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.45,
        "perishability_days": 7,
        "perishability_tier": "HIGH",
        "category": "Fruit",
    },
    "Lemon": {
        "baseline_demand_kg": 4800,
        "base_modal_price": 56.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.36,
        "perishability_days": 15,
        "perishability_tier": "MEDIUM",
        "category": "Fruit",
    },

    # ── Spices & Aromatics ───────────────────────────────────────────────────
    "Chilli": {
        "baseline_demand_kg": 4500,
        "base_modal_price": 48.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.30,
        "perishability_days": 14,
        "perishability_tier": "MEDIUM",
        "category": "Spice",
    },
    "Garlic": {
        "baseline_demand_kg": 3800,
        "base_modal_price": 165.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.28,
        "perishability_days": 90,
        "perishability_tier": "LOW",
        "category": "Spice",
    },
    "Ginger": {
        "baseline_demand_kg": 4200,
        "base_modal_price": 92.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.35,
        "perishability_days": 30,
        "perishability_tier": "MEDIUM",
        "category": "Spice",
    },
    "Turmeric": {
        "baseline_demand_kg": 4000,
        "base_modal_price": 155.0,
        "msp_floor": 0.0,
        "price_elasticity": -0.30,
        "perishability_days": 300,
        "perishability_tier": "NON_PERISHABLE",
        "category": "Spice",
    },
}

KNOWN_CROPS = list(COMMODITY_PROFILES.keys())

# 25 Major Regional Production & Terminal APMC Districts
KNOWN_DISTRICTS = [
    "Pune", "Nashik", "Ahmednagar", "Solapur", "Nagpur",
    "Satara", "Kolhapur", "Sangli", "Jalgaon", "Aurangabad",
    "Mumbai", "Kadapa", "Kurnool", "Guntur", "Hyderabad",
    "Bengaluru", "Indore", "Bhopal", "Jaipur", "Lucknow",
    "Delhi", "Ahmedabad", "Surat", "Chandigarh", "Kolkata",
]

KNOWN_SEASONS = ["Kharif", "Rabi", "Zaid"]


# ─── APMC Road Distance Matrix (Kilometers) ──────────────────────────────────
# Connects agricultural production clusters with major terminal APMC consumption centers.
MANDI_DISTANCE_MATRIX: Dict[Tuple[str, str], float] = {
    # Maharashtra / Western Corridors
    ("Pune", "Mumbai"): 152.0,
    ("Pune", "Nashik"): 210.0,
    ("Pune", "Ahmednagar"): 120.0,
    ("Pune", "Satara"): 115.0,
    ("Pune", "Solapur"): 250.0,
    ("Pune", "Kolhapur"): 235.0,
    ("Pune", "Sangli"): 240.0,
    ("Nashik", "Mumbai"): 168.0,
    ("Nashik", "Ahmednagar"): 160.0,
    ("Nashik", "Jalgaon"): 235.0,
    ("Ahmednagar", "Mumbai"): 255.0,
    ("Solapur", "Mumbai"): 395.0,
    ("Kolhapur", "Mumbai"): 380.0,
    ("Nagpur", "Mumbai"): 815.0,
    ("Nagpur", "Pune"): 720.0,
    ("Nagpur", "Bhopal"): 350.0,
    ("Jalgaon", "Mumbai"): 415.0,
    ("Aurangabad", "Pune"): 235.0,
    ("Aurangabad", "Mumbai"): 335.0,
    ("Ahmedabad", "Mumbai"): 525.0,
    ("Surat", "Mumbai"): 285.0,
    ("Ahmedabad", "Surat"): 265.0,

    # South Corridors (Kadapa, Kurnool, Guntur, Hyderabad, Bengaluru)
    ("Kadapa", "Bengaluru"): 280.0,
    ("Kadapa", "Hyderabad"): 410.0,
    ("Kurnool", "Hyderabad"): 215.0,
    ("Kurnool", "Bengaluru"): 360.0,
    ("Guntur", "Hyderabad"): 270.0,
    ("Hyderabad", "Bengaluru"): 570.0,
    ("Hyderabad", "Mumbai"): 710.0,
    ("Bengaluru", "Mumbai"): 980.0,

    # Central / North Corridors
    ("Indore", "Bhopal"): 195.0,
    ("Indore", "Mumbai"): 585.0,
    ("Bhopal", "Delhi"): 780.0,
    ("Jaipur", "Delhi"): 280.0,
    ("Chandigarh", "Delhi"): 245.0,
    ("Lucknow", "Delhi"): 530.0,
    ("Kolkata", "Delhi"): 1470.0,
}


def get_mandi_distance(origin: str, destination: str) -> float:
    """Return highway road transit distance between two APMC districts in km."""
    if origin == destination:
        return 0.0
    return MANDI_DISTANCE_MATRIX.get(
        (origin, destination),
        MANDI_DISTANCE_MATRIX.get((destination, origin), 220.0),
    )


def compute_mandi_arbitrage(
    crop: str,
    origin_district: str,
    local_modal_price: float,
    current_supply_kg: float,
) -> dict:
    """
    Calculates whether a farmer/FPO should sell locally or dispatch produce to
    a neighboring regional consumption hub (e.g. Pune -> Vashi/Mumbai APMC).
    Accounts for commercial freight (diesel rate ₹90/L + standard truck freight ₹3.50/t-km).
    """
    profile = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES["Tomato"])

    # Determine regional terminal candidates
    if origin_district in ["Kadapa", "Kurnool", "Guntur", "Hyderabad", "Bengaluru"]:
        candidate_mandis = ["Bengaluru", "Hyderabad", "Mumbai"]
    elif origin_district in ["Indore", "Bhopal", "Jaipur", "Lucknow", "Delhi", "Chandigarh"]:
        candidate_mandis = ["Delhi", "Indore", "Jaipur"]
    elif origin_district in ["Kolkata"]:
        candidate_mandis = ["Kolkata"]
    else:
        candidate_mandis = ["Mumbai", "Pune", "Nashik", "Nagpur", "Ahmedabad"]

    if origin_district in candidate_mandis:
        candidate_mandis = [m for m in candidate_mandis if m != origin_district]

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
        "Delhi": 1.25,   # Azadpur APMC
        "Bengaluru": 1.22, # Yeshwanthpur APMC
        "Hyderabad": 1.18, # Bowenpally APMC
        "Kolkata": 1.20,
        "Pune": 1.15,
        "Ahmedabad": 1.12,
        "Nashik": 1.05,
        "Nagpur": 1.12,
        "Indore": 1.10,
        "Jaipur": 1.10,
    }

    for target in candidate_mandis:
        dist = get_mandi_distance(origin_district, target)
        if dist > 550 and profile["perishability_tier"] in ("CRITICAL", "HIGH"):
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
    day: Optional[int] = None,
    year: Optional[int] = None,
    season: Optional[str] = None,
    festival_period: bool = False,
    previous_demand_kg: Optional[float] = None,
    current_supply_kg: Optional[float] = None,
    supply_lag7_kg: Optional[float] = None,
    temperature_celsius: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
    modal_price_lag1: Optional[float] = None,
    modal_price_lag7: Optional[float] = None,
) -> dict:
    """
    Constructs a multi-dimensional agricultural feature vector aligned with
    Agmarknet / e-NAM and microeconomic price elasticity principles.
    Incorporates 77 features: Fourier harmonics, festival multiplier, weather stress,
    price volatility, and spatial APMC embeddings.
    """
    now = datetime.now()
    if year is None:
        year = now.year
    if month is None:
        month = now.month
    if day is None:
        day = min(now.day, 28)
    if season is None:
        season = detect_season(month)

    try:
        sample_dt = datetime(year, month, day)
    except ValueError:
        sample_dt = datetime(year, month, 15)

    profile = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES["Tomato"])
    base_demand = profile["baseline_demand_kg"]
    base_price = profile["base_modal_price"]
    msp_floor = profile.get("msp_floor", 0.0)

    if previous_demand_kg is None:
        previous_demand_kg = float(base_demand)
    if current_supply_kg is None:
        current_supply_kg = float(base_demand * 0.95)
    if supply_lag7_kg is None:
        supply_lag7_kg = float(current_supply_kg * 0.98)
    if temperature_celsius is None:
        temperature_celsius = 26.0 + 8.0 * math.sin((month - 4) * math.pi / 6)
    if humidity_pct is None:
        humidity_pct = 65.0 if season == "Kharif" else 45.0
    if rainfall_mm is None:
        rainfall_mm = 5.0 if season == "Kharif" else 0.2
    if modal_price_lag1 is None:
        modal_price_lag1 = base_price
    if modal_price_lag7 is None:
        modal_price_lag7 = base_price * 0.98

    # 1. Festival Proximity Multiplier & Harmonics
    fest_mult, fest_name = calculate_festival_multiplier(sample_dt, crop)
    effective_fest_flag = 1.0 if (festival_period or fest_mult > 1.08) else 0.0

    # 2. Fourier harmonics (annual & semi-annual cycles)
    harmonics = calculate_fourier_harmonics(sample_dt)

    # 3. Intra-week cadence
    dow = sample_dt.weekday()
    dow_angle = 2 * math.pi * dow / 7.0

    row = {}

    # 1. Cyclical seasonality
    row.update(month_cyclical_features(month))
    row["doy_sin"] = harmonics["doy_sin"]
    row["doy_cos"] = harmonics["doy_cos"]
    row["semi_sin"] = harmonics["semi_sin"]
    row["semi_cos"] = harmonics["semi_cos"]
    row["dow_sin"] = round(math.sin(dow_angle), 6)
    row["dow_cos"] = round(math.cos(dow_angle), 6)
    row["is_weekend"] = 1.0 if dow in (5, 6) else 0.0

    # 2. Demand, supply & volume metrics (in MT & kg)
    row["previous_demand_kg"] = float(previous_demand_kg)
    row["current_supply_kg"] = float(current_supply_kg)
    row["supply_tonnes"] = round(float(current_supply_kg) / 1000.0, 3)
    row["demand_supply_ratio"] = round(previous_demand_kg / max(1.0, current_supply_kg), 4)
    row["supply_momentum_7d"] = round((current_supply_kg - supply_lag7_kg) / max(1.0, supply_lag7_kg), 4)

    # 3. Market price dynamics & momentum (Agmarknet modal prices)
    row["modal_price_lag1"] = float(modal_price_lag1)
    row["modal_price_lag7"] = float(modal_price_lag7)
    row["price_momentum_7d"] = round((modal_price_lag1 - modal_price_lag7) / max(0.1, modal_price_lag7), 4)
    row["price_volatility_7d"] = round(abs(modal_price_lag1 - modal_price_lag7) / max(0.1, modal_price_lag1), 4)
    row["msp_floor_ratio"] = round(modal_price_lag1 / max(1.0, msp_floor), 4) if msp_floor > 0 else 1.0

    # 4. Exogenous signals (weather & festivals)
    row["festival_flag"] = effective_fest_flag
    row["festival_multiplier"] = round(float(fest_mult), 3)
    row["temperature_celsius"] = round(float(temperature_celsius), 1)
    row["humidity_pct"] = round(float(humidity_pct), 1)
    row["rainfall_mm"] = round(float(rainfall_mm), 1)
    row["heat_stress_index"] = round(float(temperature_celsius) + 0.05 * float(humidity_pct), 2)

    # 5. Perishability degradation & economic parameters
    is_perishable = 1.0 if profile["perishability_tier"] in ("CRITICAL", "HIGH") else 0.0
    row["perishability_heat_penalty"] = round(max(0.0, (temperature_celsius - 28.0)) * is_perishable, 3)
    row["price_elasticity_coeff"] = profile["price_elasticity"]
    row["perishability_baseline_days"] = float(profile["perishability_days"])

    deprec = calculate_perishability_depreciation(
        crop=crop,
        base_modal_price=base_price,
        transit_days=1.5,
        temp_c=float(temperature_celsius),
    )
    row["shelf_life_depreciation_factor"] = deprec["decay_fraction"]

    # 6. One-hot categorical encodings across all 24 crops, 25 districts, 3 seasons
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
