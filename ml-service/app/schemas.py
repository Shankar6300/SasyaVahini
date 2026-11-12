"""
SasyaVahini ML Service — Pydantic Request/Response Schemas

Defines the API contract for the advanced agricultural demand forecasting &
pricing intelligence service (SIH 2026 Problem Statement 26033 - DoCA).
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ─── Daily Forecast Horizon & Arbitrage Models ───────────────────────────────

class DailyForecastItem(BaseModel):
    """Day-by-day probabilistic trajectory for a 7-day planning window."""
    day: int = Field(description="Forecast horizon day (1-7)")
    date: str = Field(description="ISO Date (YYYY-MM-DD)")
    p10_kg: float = Field(description="P10 pessimistic demand floor (kg)")
    p50_kg: float = Field(description="P50 expected median demand (kg)")
    p90_kg: float = Field(description="P90 optimistic demand ceiling (kg)")
    expected_price_per_kg: float = Field(description="Projected clearing price (₹/kg)")


class MandiArbitrageAdvisory(BaseModel):
    """Cross-mandi price differential taking diesel and freight friction into account."""
    origin_mandi: str = Field(description="Local APMC mandi in farmer's district")
    recommended_mandi: str = Field(description="Target APMC mandi with highest net realized price")
    origin_modal_price: float = Field(description="Current modal price at origin (₹/kg)")
    target_modal_price: float = Field(description="Current modal price at destination (₹/kg)")
    freight_cost_per_kg: float = Field(description="Estimated transport cost (₹/kg) based on distance")
    net_arbitrage_gain_per_kg: float = Field(description="Net profit gain after logistics costs (₹/kg)")
    distance_km: float = Field(description="Road transit distance in km")
    signal: str = Field(description="'STRONG_ARBITRAGE', 'MODERATE_ARBITRAGE', or 'SELL_LOCAL'")


# ─── Demand Forecast ─────────────────────────────────────────────────────────

class DemandForecastRequest(BaseModel):
    """Input parameters for predicting regional crop demand with multi-horizon uncertainty."""

    crop: str = Field(
        ...,
        description="Crop name (e.g. 'Tomato', 'Onion', 'Wheat', 'Rice')",
        examples=["Tomato"],
    )
    district: str = Field(
        ...,
        description="District name for regional demand",
        examples=["Pune"],
    )
    state: str = Field(
        ...,
        description="State name",
        examples=["Maharashtra"],
    )
    month: Optional[int] = Field(
        None,
        ge=1, le=12,
        description="Month of forecast (1–12). Defaults to current month if omitted.",
    )
    season: Optional[str] = Field(
        None,
        description="Agricultural season: Kharif, Rabi, Zaid. Auto-detected from month if omitted.",
    )
    festival_period: Optional[bool] = Field(
        False,
        description="Whether the forecast period overlaps a major festival / consumption spike.",
    )
    previous_demand_kg: Optional[float] = Field(
        None, ge=0,
        description="Previous period's observed demand in kg (lag t-1 / t-7).",
    )
    current_supply_kg: Optional[float] = Field(
        None, ge=0,
        description="Current regional arrival/supply volume in kg.",
    )
    temperature_celsius: Optional[float] = Field(
        None,
        description="Average ambient temperature in °C (affects perishability & spoilage velocity).",
    )
    current_price_per_kg: Optional[float] = Field(
        None, ge=0,
        description="Optional local mandi spot rate in ₹/kg. If omitted, resolved automatically from live Agmarknet APMC state.",
    )


class DemandForecastResponse(BaseModel):
    """Output from the multi-horizon quantile demand prediction model."""

    crop: str
    district: str
    state: str
    predicted_demand_kg: float = Field(description="P50 expected median demand in kg")
    demand_p10_kg: float = Field(description="P10 pessimistic demand floor (80% confidence lower bound)")
    demand_p90_kg: float = Field(description="P90 optimistic demand ceiling (80% confidence upper bound)")
    current_supply_kg: float = Field(description="Supply figure used in prediction")
    demand_gap_kg: float = Field(description="predicted_demand − current_supply")
    demand_level: str = Field(description="HIGH / MEDIUM / LOW classification")
    recommended_price_per_kg: Optional[float] = Field(
        None,
        description="Econometrically cleared listing price per kg",
    )
    spot_price_used: Optional[float] = Field(
        None,
        description="Spot price anchor used for the forecast baseline (₹/kg)",
    )
    spot_price_source: Optional[str] = Field(
        None,
        description="Source of the spot price: 'user_specified', 'live_agmarknet_apmc', or 'profile_baseline'",
    )
    msp_floor: Optional[float] = Field(
        None,
        description="Statutory GoI Minimum Support Price floor (₹/kg) if applicable",
    )
    guardrails_applied: List[str] = Field(
        default_factory=list,
        description="Econometric circuit breakers and policy guardrails triggered",
    )
    price_elasticity: Optional[float] = Field(
        None,
        description="Estimated price elasticity coefficient for this commodity",
    )
    confidence_score: Optional[float] = Field(
        None,
        description="Quantile empirical coverage score and cross-validation R²",
    )
    daily_trajectory: List[DailyForecastItem] = Field(
        default_factory=list,
        description="7-day daily forecast vector with P10/P50/P90 intervals",
    )
    arbitrage_advisory: Optional[MandiArbitrageAdvisory] = Field(
        None,
        description="Cross-district mandi arbitrage recommendations",
    )
    model_version: str = Field(description="Version tag of the model that produced this forecast")
    is_fallback: bool = Field(
        False,
        description="True if rule-based fallback was used instead of ML artifacts",
    )
    explanations: List[str] = Field(
        default_factory=list,
        description="Mathematical marginal contribution factors driving this forecast",
    )


# ─── Price Recommendation ───────────────────────────────────────────────────

class PriceRecommendRequest(BaseModel):
    """Input for the price recommendation endpoint."""

    crop: str = Field(..., examples=["Tomato"])
    district: str = Field(..., examples=["Pune"])
    state: str = Field(..., examples=["Maharashtra"])
    quantity_kg: float = Field(..., gt=0, examples=[1500])
    current_supply_kg: Optional[float] = Field(None, ge=0)
    predicted_demand_kg: Optional[float] = Field(None, ge=0)
    historical_price_per_kg: Optional[float] = Field(None, ge=0)
    current_price_per_kg: Optional[float] = Field(None, ge=0, description="Optional local spot quote in ₹/kg")
    transit_days: Optional[float] = Field(1.5, ge=0)


class PriceRecommendResponse(BaseModel):
    """Output from the microeconomic price recommendation model."""

    crop: str
    district: str
    recommended_price_per_kg: float
    price_range_min: float
    price_range_max: float
    currency: str = "INR"
    spot_price_used: Optional[float] = None
    spot_price_source: Optional[str] = None
    msp_floor: Optional[float] = None
    guardrails_applied: List[str] = Field(default_factory=list)
    elasticity_coefficient: float = Field(description="Price elasticity of demand (ε = %ΔQ / %ΔP)")
    market_clearing_volume_kg: float = Field(description="Volume projected to clear at this price point")
    spoilage_adjusted_gate_price: float = Field(description="Recommended price after transit decay discounting")
    explanations: List[str] = Field(default_factory=list)
    model_version: str
    is_fallback: bool = False


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Service health check response."""

    status: str
    service: str
    version: str
    models_loaded: bool
    model_version: Optional[str] = None
    algorithms: Optional[List[str]] = None
