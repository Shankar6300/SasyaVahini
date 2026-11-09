"""
SasyaVahini ML Service — FastAPI Application

Serves multi-horizon quantile demand forecasting, inter-mandi spatial arbitrage,
and price elasticity recommendations via REST API.
SIH 2026 — Ministry of Consumer Affairs, Food & Public Distribution (DoCA).

Endpoints:
    GET  /health           — Service health and model status
    POST /predict-demand   — Probabilistic crop demand forecast (P10/P50/P90 + 7-day trajectory + Arbitrage)
    POST /recommend-price  — Econometrically cleared fair price recommendation
    GET  /model-info       — Model training metadata, pinball loss, and coverage calibration
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, MODEL_VERSION
from app.models.demand_model import (
    are_models_loaded,
    get_model_metadata,
    get_model_version,
    load_models,
    predict_demand,
    predict_price,
)
from app.schemas import (
    DemandForecastRequest,
    DemandForecastResponse,
    HealthResponse,
    PriceRecommendRequest,
    PriceRecommendResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup."""
    print("[ML Service] Starting up — loading advanced quantile models...")
    loaded = load_models()
    if not loaded:
        print("[ML Service] Models not found — endpoints will use microeconomic fallback")
        print("[ML Service] Run 'python -m app.training.train' to train models")
    yield
    print("[ML Service] Shutting down")


app = FastAPI(
    title="SasyaVahini ML Service",
    description=(
        "AI multi-horizon quantile demand forecasting, inter-mandi arbitrage, "
        "and price elasticity clearing engine. "
        "Smart India Hackathon 2026 — Problem Statement 26033 (DoCA)."
    ),
    version=MODEL_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Service health check — reports loaded models and active algorithmic pipelines."""
    return HealthResponse(
        status="online",
        service="SasyaVahini Agricultural Intelligence Engine",
        version=MODEL_VERSION,
        models_loaded=are_models_loaded(),
        model_version=get_model_version() if are_models_loaded() else None,
        algorithms=[
            "HistGradientBoosting Quantile Regression (P10, P50, P90)",
            "Microeconomic Price Elasticity Market Clearing",
            "Spatial APMC Mandi Road Distance Arbitrage",
            "Perishability Respiration Decay Velocity Model",
        ],
    )


# ─── Demand Forecast ─────────────────────────────────────────────────────────

@app.post("/predict-demand", response_model=DemandForecastResponse)
def predict_demand_endpoint(req: DemandForecastRequest):
    """
    Predict regional crop demand with multi-horizon uncertainty (P10, P50, P90),
    7-day day-by-day trajectory vector, and cross-mandi arbitrage recommendations.
    """
    try:
        result = predict_demand(
            crop=req.crop,
            district=req.district,
            state=req.state,
            month=req.month,
            season=req.season,
            festival_period=req.festival_period or False,
            previous_demand_kg=req.previous_demand_kg,
            current_supply_kg=req.current_supply_kg,
            temperature_celsius=req.temperature_celsius,
        )
        return DemandForecastResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ─── Price Recommendation ───────────────────────────────────────────────────

@app.post("/recommend-price", response_model=PriceRecommendResponse)
def recommend_price_endpoint(req: PriceRecommendRequest):
    """
    Recommend revenue-maximizing fair listing price grounded in commodity price elasticity
    and perishable transit decay discounting.
    """
    try:
        result = predict_price(
            crop=req.crop,
            district=req.district,
            state=req.state,
            quantity_kg=req.quantity_kg,
            current_supply_kg=req.current_supply_kg,
            predicted_demand_kg=req.predicted_demand_kg,
            historical_price_per_kg=req.historical_price_per_kg,
            transit_days=req.transit_days or 1.5,
        )
        return PriceRecommendResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Price recommendation failed: {str(e)}")


# ─── Model Info (internal/debug) ─────────────────────────────────────────────

@app.get("/model-info")
def model_info():
    """Return model training metadata, coverage calibration, and pinball loss metrics."""
    if not are_models_loaded():
        return {
            "status": "no_model",
            "message": "No trained model loaded. Run 'python -m app.training.train' first.",
        }
    return get_model_metadata()
