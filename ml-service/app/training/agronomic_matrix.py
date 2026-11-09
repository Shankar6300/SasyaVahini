"""
SasyaVahini ML — Agronomic Perishability Matrix & Indian Festival Calendar Engine
National Horticulture Board (NHB) & ICAR Post-Harvest Standards.
SIH 2026 — Ministry of Consumer Affairs, Food & Public Distribution (DoCA).
"""

from datetime import datetime
import math
from typing import Dict, Optional, Tuple

# ─── 1. Indian Festival & Holiday Calendar (2025–2026) ────────────────────────
# Captures major socio-cultural consumption demand shocks across India
# Especially Maharashtra (Pune/Mumbai corridor) and Andhra Pradesh / South.

INDIAN_FESTIVALS = [
    # 2025
    {"name": "Makar Sankranti / Pongal", "date": "2025-01-14", "duration_days": 3, "surge_crops": ["Sugarcane", "Rice", "Banana", "Vegetables"], "default_surge": 1.25},
    {"name": "Maha Shivratri", "date": "2025-02-26", "duration_days": 2, "surge_crops": ["Banana", "Potato", "Fruit"], "default_surge": 1.20},
    {"name": "Holi", "date": "2025-03-14", "duration_days": 2, "surge_crops": ["Wheat", "Vegetables", "Tomato", "Onion"], "default_surge": 1.20},
    {"name": "Ugadi / Gudi Padwa", "date": "2025-03-30", "duration_days": 2, "surge_crops": ["Banana", "Grapes", "Vegetables", "Mango"], "default_surge": 1.30},
    {"name": "Eid-ul-Fitr", "date": "2025-03-31", "duration_days": 3, "surge_crops": ["Onion", "Tomato", "Chilli", "Rice"], "default_surge": 1.30},
    {"name": "Summer Wedding Season", "date": "2025-05-01", "duration_days": 30, "surge_crops": ["Tomato", "Onion", "Potato", "Cauliflower", "Rice"], "default_surge": 1.25},
    {"name": "Bakrid / Eid-ul-Adha", "date": "2025-06-07", "duration_days": 3, "surge_crops": ["Onion", "Tomato", "Chilli", "Rice"], "default_surge": 1.35},
    {"name": "Ganesh Chaturthi", "date": "2025-08-27", "duration_days": 10, "surge_crops": ["Banana", "Grapes", "Pomegranate", "Vegetables"], "default_surge": 1.40},
    {"name": "Navratri / Dussehra", "date": "2025-09-22", "duration_days": 10, "surge_crops": ["Potato", "Tomato", "Banana", "Fruit"], "default_surge": 1.35},
    {"name": "Diwali / Dhanteras", "date": "2025-10-20", "duration_days": 5, "surge_crops": ["Onion", "Potato", "Tomato", "Banana", "Wheat"], "default_surge": 1.45},
    {"name": "Winter Wedding Season", "date": "2025-11-20", "duration_days": 25, "surge_crops": ["Tomato", "Onion", "Potato", "Cauliflower", "Chilli"], "default_surge": 1.30},

    # 2026
    {"name": "Makar Sankranti / Pongal", "date": "2026-01-14", "duration_days": 3, "surge_crops": ["Sugarcane", "Rice", "Banana", "Vegetables"], "default_surge": 1.25},
    {"name": "Maha Shivratri", "date": "2026-02-15", "duration_days": 2, "surge_crops": ["Banana", "Potato", "Fruit"], "default_surge": 1.20},
    {"name": "Holi", "date": "2026-03-04", "duration_days": 2, "surge_crops": ["Wheat", "Vegetables", "Tomato", "Onion"], "default_surge": 1.20},
    {"name": "Ugadi / Gudi Padwa", "date": "2026-03-19", "duration_days": 2, "surge_crops": ["Banana", "Grapes", "Vegetables"], "default_surge": 1.30},
    {"name": "Eid-ul-Fitr", "date": "2026-03-20", "duration_days": 3, "surge_crops": ["Onion", "Tomato", "Chilli", "Rice"], "default_surge": 1.30},
    {"name": "Summer Wedding Season", "date": "2026-05-01", "duration_days": 30, "surge_crops": ["Tomato", "Onion", "Potato", "Cauliflower", "Rice"], "default_surge": 1.25},
    {"name": "Bakrid / Eid-ul-Adha", "date": "2026-05-27", "duration_days": 3, "surge_crops": ["Onion", "Tomato", "Chilli", "Rice"], "default_surge": 1.35},
    {"name": "Ganesh Chaturthi", "date": "2026-09-14", "duration_days": 10, "surge_crops": ["Banana", "Grapes", "Pomegranate", "Vegetables"], "default_surge": 1.40},
    {"name": "Navratri / Dussehra", "date": "2026-10-11", "duration_days": 10, "surge_crops": ["Potato", "Tomato", "Banana", "Fruit"], "default_surge": 1.35},
    {"name": "Diwali / Dhanteras", "date": "2026-11-08", "duration_days": 5, "surge_crops": ["Onion", "Potato", "Tomato", "Banana", "Wheat"], "default_surge": 1.45},
    {"name": "Winter Wedding Season", "date": "2026-11-20", "duration_days": 25, "surge_crops": ["Tomato", "Onion", "Potato", "Cauliflower", "Chilli"], "default_surge": 1.30},
]


def calculate_fourier_harmonics(dt: datetime) -> dict:
    """
    Computes Fourier sin/cos harmonics on day-of-year (annual cycle)
    and semi-annual harmonics (capturing Kharif/Rabi harvest & wedding seasons).
    """
    day_of_year = dt.timetuple().tm_yday
    days_in_year = 366 if (dt.year % 4 == 0 and (dt.year % 100 != 0 or dt.year % 400 == 0)) else 365

    # 1st harmonic (annual cycle)
    theta_1 = 2.0 * math.pi * day_of_year / days_in_year
    # 2nd harmonic (semi-annual cycle: 6-month monsoon/harvest alternation)
    theta_2 = 4.0 * math.pi * day_of_year / days_in_year

    return {
        "doy_sin": round(math.sin(theta_1), 6),
        "doy_cos": round(math.cos(theta_1), 6),
        "semi_sin": round(math.sin(theta_2), 6),
        "semi_cos": round(math.cos(theta_2), 6),
    }


def calculate_festival_multiplier(dt: datetime, crop: str) -> Tuple[float, Optional[str]]:
    """
    Computes Gaussian proximity festival demand surge multiplier M_fest(t).
    Procurement ramps up 5 days prior to festival and peaks during the event.
    """
    date_str = dt.strftime("%Y-%m-%d")
    best_multiplier = 1.0
    active_festival = None

    for fest in INDIAN_FESTIVALS:
        fest_dt = datetime.strptime(fest["date"], "%Y-%m-%d")
        delta_days = (dt - fest_dt).days

        # Festival surge active window: 5 days pre-festival through duration
        duration = fest["duration_days"]
        if -5 <= delta_days <= duration:
            # Gaussian peak centered 1 day before start
            sigma = max(2.5, duration / 2.0)
            center = -1.0
            gaussian_weight = math.exp(-((delta_days - center) ** 2) / (2.0 * (sigma ** 2)))
            
            surge_potential = fest["default_surge"] if (crop in fest["surge_crops"] or "Vegetables" in fest["surge_crops"]) else 1.10
            multiplier = 1.0 + (surge_potential - 1.0) * gaussian_weight
            
            if multiplier > best_multiplier:
                best_multiplier = multiplier
                active_festival = fest["name"]

    return round(best_multiplier, 3), active_festival


# ─── 2. Agronomic Perishability Matrix (NHB / ICAR Standards) ────────────────
# Post-harvest decay parameters, baseline shelf lives, and respiration rates.

AGRONOMIC_PERISHABILITY_MATRIX: Dict[str, dict] = {
    "Tomato": {
        "shelf_life_ambient_days": 4.5,     # Ambient shelf life (25-30°C)
        "shelf_life_cold_days": 12.0,       # Cold store (10-12°C, 90% RH)
        "decay_velocity_lambda": 0.22,      # Daily decay velocity (Fraction of quality lost/day)
        "c_perish": 0.85,                   # Perishability index C_perish in [0, 1]
        "respiration_rate_mg_co2": 22.0,    # mg CO2 / kg-hr at 20°C (High respiration)
        "optimal_storage_temp_c": 12.0,
        "category": "High Perishable Vegetable",
    },
    "Onion": {
        "shelf_life_ambient_days": 75.0,    # Dry ventilated storage (60-90 days)
        "shelf_life_cold_days": 150.0,      # Controlled cold storage (0-2°C, 65-70% RH)
        "decay_velocity_lambda": 0.012,     # Low daily decay velocity
        "c_perish": 0.20,                   # Perishability index C_perish (Low, but vulnerable to humidity)
        "respiration_rate_mg_co2": 4.5,     # mg CO2 / kg-hr at 20°C (Very low)
        "optimal_storage_temp_c": 25.0,     # Dry ambient, avoid moisture (causes sprouting & black mold)
        "category": "Semi-Perishable Bulb",
    },
    "Potato": {
        "shelf_life_ambient_days": 60.0,
        "shelf_life_cold_days": 180.0,
        "decay_velocity_lambda": 0.010,
        "c_perish": 0.15,
        "respiration_rate_mg_co2": 6.0,
        "optimal_storage_temp_c": 10.0,
        "category": "Storage Tuber",
    },
    "Banana": {
        "shelf_life_ambient_days": 5.0,     # Ripe shelf life
        "shelf_life_cold_days": 10.0,
        "decay_velocity_lambda": 0.25,
        "c_perish": 0.90,
        "respiration_rate_mg_co2": 35.0,    # Climacteric fruit (Ethylene burst)
        "optimal_storage_temp_c": 13.5,     # Chilling injury occurs below 12°C
        "category": "Climacteric Perishable Fruit",
    },
    "Chilli": {
        "shelf_life_ambient_days": 12.0,
        "shelf_life_cold_days": 28.0,
        "decay_velocity_lambda": 0.075,
        "c_perish": 0.45,
        "respiration_rate_mg_co2": 15.0,
        "optimal_storage_temp_c": 9.0,
        "category": "Medium Perishable Spice",
    },
    "Grapes": {
        "shelf_life_ambient_days": 4.0,
        "shelf_life_cold_days": 21.0,
        "decay_velocity_lambda": 0.24,
        "c_perish": 0.88,
        "respiration_rate_mg_co2": 18.0,
        "optimal_storage_temp_c": 0.5,
        "category": "High Perishable Berry",
    },
    "Wheat": {
        "shelf_life_ambient_days": 365.0,
        "shelf_life_cold_days": 730.0,
        "decay_velocity_lambda": 0.0008,
        "c_perish": 0.02,
        "respiration_rate_mg_co2": 0.5,
        "optimal_storage_temp_c": 20.0,
        "category": "Dry Staple Cereal",
    },
    "Rice": {
        "shelf_life_ambient_days": 365.0,
        "shelf_life_cold_days": 730.0,
        "decay_velocity_lambda": 0.0008,
        "c_perish": 0.02,
        "respiration_rate_mg_co2": 0.5,
        "optimal_storage_temp_c": 20.0,
        "category": "Dry Staple Cereal",
    },
}


def calculate_perishability_depreciation(
    crop: str,
    base_modal_price: float,
    transit_days: float = 1.0,
    harvest_age_days: float = 0.5,
    temp_c: float = 27.0,
    gamma: float = 0.30,
) -> dict:
    """
    Computes fair price depreciation discount:
      Delta P_perish = gamma * C_perish * ((transit_days + age) / shelf_life) * theta_heat

    Gives clear economic pricing transparency so farmers get fair value and don't
    suffer total post-harvest write-offs.
    """
    matrix = AGRONOMIC_PERISHABILITY_MATRIX.get(crop, AGRONOMIC_PERISHABILITY_MATRIX["Tomato"])
    shelf_life = matrix["shelf_life_ambient_days"]
    c_perish = matrix["c_perish"]

    # Thermal degradation factor (Arrhenius / Q10 law: respiration doubles every 10°C above 20°C)
    theta_heat = max(1.0, 1.0 + 0.035 * max(0.0, temp_c - 25.0))

    # Total elapsed exposure age relative to biological shelf-life
    total_elapsed = transit_days + harvest_age_days
    decay_fraction = min(1.0, total_elapsed / max(1.0, shelf_life))

    # Fair price discount rate: Delta P = gamma * C_perish * decay_fraction * theta_heat
    depreciation_rate = min(0.40, gamma * c_perish * decay_fraction * theta_heat)
    discount_amount = round(base_modal_price * depreciation_rate, 2)
    fair_gate_price = max(base_modal_price * 0.60, round(base_modal_price - discount_amount, 2))

    urgency_status = (
        "CRITICAL_IMMEDIATE_CLEARANCE" if decay_fraction > 0.60
        else "ELEVATED_DECAY_RISK" if decay_fraction > 0.35
        else "PRIME_QUALITY"
    )

    return {
        "crop": crop,
        "c_perish": c_perish,
        "shelf_life_ambient_days": shelf_life,
        "decay_fraction": round(decay_fraction, 3),
        "thermal_acceleration_factor": round(theta_heat, 2),
        "depreciation_rate_pct": round(depreciation_rate * 100.0, 1),
        "discount_per_kg": discount_amount,
        "fair_gate_price_per_kg": fair_gate_price,
        "urgency_status": urgency_status,
        "respiration_tier": matrix["category"],
    }

