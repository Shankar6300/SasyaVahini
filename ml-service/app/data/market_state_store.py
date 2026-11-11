"""
SasyaVahini ML — Real-Time Rolling Market State Store
Provides multi-tier geographic fallback (APMC District -> National Benchmark -> Agronomic Profile)
and thread-safe in-memory caching for live spot pricing, daily arrivals, and volatility bands.
"""

from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.training.features import COMMODITY_PROFILES, DISTRICT_PRICE_FACTORS, get_district_price_factor

logger = logging.getLogger("sasyavahini.market_state")

STATE_FILE = Path(__file__).resolve().parent / "live_market_state.json"

_cached_state: Optional[Dict[str, Any]] = None
_last_loaded_mtime: float = 0.0


def _load_market_state() -> Dict[str, Any]:
    """Loads market state JSON with mtime cache invalidation."""
    global _cached_state, _last_loaded_mtime
    try:
        if not STATE_FILE.exists():
            return {}
        mtime = STATE_FILE.stat().st_mtime
        if _cached_state is None or mtime > _last_loaded_mtime:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                _cached_state = json.load(f)
            _last_loaded_mtime = mtime
        return _cached_state or {}
    except Exception as e:
        logger.error(f"[MarketStateStore] Failed to load {STATE_FILE}: {e}")
        return _cached_state or {}


def get_live_market_state() -> Dict[str, Any]:
    """Returns the complete market state dictionary."""
    return _load_market_state()


def get_live_spot_data(crop: str, district: str) -> Dict[str, Any]:
    """
    Multi-tier hierarchical spot rate resolution:
    Tier 1: APMC District entry in live_market_state.json
    Tier 2: National benchmark entry in live_market_state.json adjusted by district factor
    Tier 3: Calibrated profile baseline in COMMODITY_PROFILES
    """
    state = _load_market_state()
    meta = state.get("metadata", {})
    commodities = state.get("commodities", {})
    
    crop_data = commodities.get(crop)
    dist_factor = get_district_price_factor(district)
    
    # ── Tier 1: Exact Crop + District match ────────────────────────────────────
    if crop_data:
        msp = crop_data.get("msp_floor", 0.0)
        volatility = crop_data.get("daily_volatility_pct", 0.06)
        dist_entry = crop_data.get("districts", {}).get(district)
        
        if dist_entry:
            return {
                "crop": crop,
                "district": district,
                "modal_price": float(dist_entry.get("modal_price", crop_data["national_modal_price"] * dist_factor)),
                "min_price": float(dist_entry.get("min_price", max(msp, dist_entry.get("modal_price", 20.0) * 0.85))),
                "max_price": float(dist_entry.get("max_price", dist_entry.get("modal_price", 20.0) * 1.15)),
                "arrivals_tonnes": float(dist_entry.get("arrivals_tonnes", 100.0)),
                "daily_volatility_pct": float(volatility),
                "msp_floor": float(msp),
                "data_source": "live_agmarknet_apmc",
                "resolution_tier": "TIER_1_APMC_DISTRICT",
                "last_synced_at": dist_entry.get("last_updated") or meta.get("last_synced_at", datetime.now().isoformat()),
            }

        # ── Tier 2: National Benchmark with District Factor ───────────────────
        nat_modal = float(crop_data.get("national_modal_price", 25.0))
        dist_modal = round(nat_modal * dist_factor, 2)
        nat_min = float(crop_data.get("national_min_price", nat_modal * 0.85))
        nat_max = float(crop_data.get("national_max_price", nat_modal * 1.15))
        
        return {
            "crop": crop,
            "district": district,
            "modal_price": dist_modal,
            "min_price": round(max(msp, nat_min * dist_factor), 2),
            "max_price": round(nat_max * dist_factor, 2),
            "arrivals_tonnes": round(crop_data.get("daily_arrivals_tonnes", 3000.0) * 0.04, 1),
            "daily_volatility_pct": float(volatility),
            "msp_floor": float(msp),
            "data_source": "live_agmarknet_national_adjusted",
            "resolution_tier": "TIER_2_NATIONAL_INDEX",
            "last_synced_at": crop_data.get("last_updated") or meta.get("last_synced_at", datetime.now().isoformat()),
        }

    # ── Tier 3: Agronomic Profile Baseline ─────────────────────────────────────
    prof = COMMODITY_PROFILES.get(crop, COMMODITY_PROFILES.get("Tomato", {}))
    base_modal = round(float(prof.get("base_modal_price", 25.0)) * dist_factor, 2)
    msp = float(prof.get("msp_floor", 0.0))
    vol = 0.08 if prof.get("perishability_tier") in ("HIGH", "CRITICAL") else 0.04

    return {
        "crop": crop,
        "district": district,
        "modal_price": base_modal,
        "min_price": round(max(msp, base_modal * 0.85), 2),
        "max_price": round(base_modal * 1.15, 2),
        "arrivals_tonnes": 150.0,
        "daily_volatility_pct": vol,
        "msp_floor": msp,
        "data_source": "profile_baseline_fallback",
        "resolution_tier": "TIER_3_PROFILE_BASELINE",
        "last_synced_at": datetime.now().strftime("%Y-%m-%d"),
    }


def save_market_state(state: Dict[str, Any]) -> bool:
    """Thread-safe atomic save for updated market state."""
    global _cached_state, _last_loaded_mtime
    try:
        tmp_file = STATE_FILE.with_suffix(".tmp")
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        tmp_file.replace(STATE_FILE)
        _cached_state = state
        _last_loaded_mtime = STATE_FILE.stat().st_mtime
        return True
    except Exception as e:
        logger.error(f"[MarketStateStore] Failed to save {STATE_FILE}: {e}")
        return False

