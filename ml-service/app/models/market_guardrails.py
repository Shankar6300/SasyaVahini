"""
SasyaVahini ML — Agricultural Econometric Guardrails Engine
Enforces real-world APMC market physics, statutory GoI MSP hard floors,
daily volatility circuit clamps, arrival volume elasticity, and rolling residual bias correction.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("sasyavahini.guardrails")

# Rolling residual error compensation memory: crop -> rolling bias (Rs/kg)
_rolling_bias_memory: Dict[str, float] = {}


def get_rolling_bias(crop: str) -> float:
    return _rolling_bias_memory.get(crop, 0.0)


def record_observed_actual(crop: str, predicted_price: float, actual_price: float, alpha: float = 0.25):
    """
    Online exponential calibration of recent model drift:
    bias_t = (1 - alpha) * bias_{t-1} + alpha * (actual_t - predicted_t)
    """
    error = actual_price - predicted_price
    prev = _rolling_bias_memory.get(crop, 0.0)
    updated = round((1.0 - alpha) * prev + alpha * error, 3)
    _rolling_bias_memory[crop] = updated
    logger.info(f"[Guardrails] Rolling residual bias for {crop} updated: {updated:+.2f} Rs/kg")


def apply_market_physics_guardrails(
    crop: str,
    district: str,
    raw_predicted_price: float,
    spot_price: float,
    msp_floor: float = 0.0,
    daily_volatility: float = 0.06,
    arrivals_today_tonnes: Optional[float] = None,
    arrivals_avg_tonnes: Optional[float] = None,
    elasticity: float = -0.40,
    horizon_day: int = 1,
) -> Dict[str, Any]:
    """
    Applies multi-layered econometric bounds to prevent model hallucination or unrealistic drift:
    1. Adaptive residual bias compensation
    2. Arrival volume elasticity response (Cobweb price pressure)
    3. Daily volatility circuit clamping (bounded day-over-day drift)
    4. Statutory GoI Minimum Support Price (MSP) hard legal floor
    """
    flags: List[str] = []
    price = raw_predicted_price

    # ── 1. Adaptive Residual Error Compensation ──────────────────────────────
    bias = get_rolling_bias(crop)
    if abs(bias) > 0.05:
        price = price + bias
        flags.append(f"RESIDUAL_BIAS_COMPENSATED({bias:+.2f}Rs)")

    # ── 2. Mandi Arrival Volume Elasticity ───────────────────────────────────
    # If today's arrivals surge significantly above normal, apply clearing price downward pressure
    if arrivals_today_tonnes is not None and arrivals_avg_tonnes is not None and arrivals_avg_tonnes > 0:
        arrival_ratio = (arrivals_today_tonnes - arrivals_avg_tonnes) / arrivals_avg_tonnes
        # Inelastic crops react sharply to arrival shocks
        price_shock_pct = arrival_ratio * (0.15 / max(0.2, abs(elasticity)))
        # Cap arrival shock adjustment to max +/- 10%
        price_shock_pct = max(-0.10, min(0.10, price_shock_pct))
        if abs(price_shock_pct) > 0.01:
            price = price * (1.0 - price_shock_pct)
            flags.append(f"ARRIVALS_ELASTICITY_ADJUSTED({-price_shock_pct:+.1%})")

    # ── 3. Daily Volatility Circuit Clamping (Circuit Breaker) ────────────────
    # Day-over-day commodity price change cannot exceed calibrated daily volatility envelope
    max_drift_pct = min(0.22, max(0.04, horizon_day * daily_volatility))
    price_floor = round(spot_price * (1.0 - max_drift_pct), 2)
    price_ceiling = round(spot_price * (1.0 + max_drift_pct), 2)

    if price < price_floor:
        flags.append(f"VOLATILITY_CIRCUIT_FLOOR_CLAMPED(min: Rs.{price_floor})")
        price = price_floor
    elif price > price_ceiling:
        flags.append(f"VOLATILITY_CIRCUIT_CEIL_CLAMPED(max: Rs.{price_ceiling})")
        price = price_ceiling

    # ── 4. Statutory GoI Minimum Support Price (MSP) Hard Floor ──────────────
    if msp_floor > 0.0 and price < msp_floor:
        flags.append(f"GOI_STATUTORY_MSP_ENFORCED(Rs.{msp_floor:.2f}/kg)")
        price = msp_floor

    final_price = round(price, 2)

    return {
        "guarded_price": final_price,
        "raw_price": round(raw_predicted_price, 2),
        "spot_price": round(spot_price, 2),
        "circuit_envelope": {
            "min_allowed": price_floor,
            "max_allowed": price_ceiling,
            "max_drift_pct": round(max_drift_pct * 100.0, 1),
        },
        "msp_floor": msp_floor,
        "flags": flags,
    }

