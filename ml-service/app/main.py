"""
SasyaVahini ML Service — FastAPI Application

Serves demand forecasting and price recommendation predictions via REST API.
This service is called by the Express.js backend (not directly by the frontend).

Endpoints:
    GET  /health           — Service health and model status
    POST /predict-demand   — Crop demand forecast for a region/period
    POST /recommend-price  — Fair listing price recommendation

Start:
    uvicorn app.main:app --port 8000 --reload
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
    print("[ML Service] Starting up — loading models...")
    loaded = load_models()
    if not loaded:
        print("[ML Service] Models not found — endpoints will use rule-based fallback")
        print("[ML Service] Run 'python -m app.training.train' to train models")
    yield
    print("[ML Service] Shutting down")


app = FastAPI(
    title="SasyaVahini ML Service",
    description=(
        "AI demand forecasting and price recommendation engine for the "
        "SasyaVahini agricultural marketplace. "
        "SIH 2026 — Problem Statement 26033."
    ),
    version=MODEL_VERSION,
    lifespan=lifespan,
)

# CORS — allow the Express backend to call us
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
    """Service health check — also reports whether ML models are loaded."""
    return HealthResponse(
        status="online",
        service="SasyaVahini ML Service",
        version=MODEL_VERSION,
        models_loaded=are_models_loaded(),
        model_version=get_model_version() if are_models_loaded() else None,
    )


# ─── Demand Forecast ─────────────────────────────────────────────────────────

@app.post("/predict-demand", response_model=DemandForecastResponse)
def predict_demand_endpoint(req: DemandForecastRequest):
    """
    Predict regional crop demand for a given period.

    Uses a trained RandomForest model when available, otherwise falls back
    to a rule-based heuristic (clearly indicated in the response).
    """
    try:
        result = predict_demand(
            crop=req.crop,
            district=req.district,
            state=req.state,
            month=req.month,
            season=req.season,
            festival_period=req.festival_period,
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
    Recommend a fair listing price for a crop based on demand-supply dynamics.
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
        )
        return PriceRecommendResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Price recommendation failed: {str(e)}")


# ─── Model Info (internal/debug) ─────────────────────────────────────────────

@app.get("/model-info")
def model_info():
    """Return model training metadata (for debugging and transparency)."""
    if not are_models_loaded():
        return {
            "status": "no_model",
            "message": "No trained model loaded. Run 'python -m app.training.train' first.",
        }
    meta = get_model_metadata()
    # Don't expose the full feature importance dict — just top 10
    importances = meta.get("demand_feature_importances", {})
    top_10 = dict(list(importances.items())[:10])
    meta["demand_feature_importances"] = top_10
    return meta
