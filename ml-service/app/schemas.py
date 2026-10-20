"""
SasyaVahini ML Service — Pydantic Request/Response Schemas

Defines the API contract between the Express backend and this ML service.
Field descriptions serve as inline API documentation in the auto-generated
FastAPI /docs page.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# ─── Demand Forecast ─────────────────────────────────────────────────────────

class DemandForecastRequest(BaseModel):
    """Input parameters for predicting regional crop demand."""

    crop: str = Field(
        ...,
        description="Crop name (e.g. 'Tomato', 'Onion', 'Wheat')",
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
        description="Previous period's observed demand in kg (for lag-based features).",
    )
    current_supply_kg: Optional[float] = Field(
        None, ge=0,
        description="Current regional supply in kg.",
    )
    temperature_celsius: Optional[float] = Field(
        None,
        description="Average ambient temperature in °C for the forecast period.",
    )


class DemandForecastResponse(BaseModel):
    """Output from the demand prediction model."""

    crop: str
    district: str
    state: str
    predicted_demand_kg: float = Field(description="Model-predicted demand in kg")
    current_supply_kg: float = Field(description="Supply figure used in prediction")
    demand_gap_kg: float = Field(description="predicted_demand − current_supply")
    demand_level: str = Field(description="HIGH / MEDIUM / LOW classification")
    recommended_price_per_kg: Optional[float] = Field(
        None,
        description="Suggested listing price per kg based on demand-supply dynamics",
    )
    confidence_score: Optional[float] = Field(
        None,
        description="Model confidence (0–1). Derived from model metrics, not hardcoded.",
    )
    model_version: str = Field(description="Version tag of the model that produced this forecast")
    is_fallback: bool = Field(
        False,
        description="True if the prediction used a rule-based fallback instead of the ML model",
    )
    explanations: List[str] = Field(
        default_factory=list,
        description="Human-readable factors driving this prediction (from feature importances)",
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


class PriceRecommendResponse(BaseModel):
    """Output from the price recommendation model."""

    crop: str
    district: str
    recommended_price_per_kg: float
    price_range_min: float
    price_range_max: float
    currency: str = "INR"
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
