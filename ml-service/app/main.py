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
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
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
from app.mlops.champion_challenger import run_champion_challenger_cycle
from app.mlops.drift_detector import evaluate_system_drift
from app.mlops.model_registry import (
    get_active_model_metadata,
    rollback_champion,
)
from app.mlops.live_sync import (
    get_live_market_state,
    live_sync_daemon_loop,
    run_sync_in_background,
    sync_live_agmarknet_data,
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
    """Load ML models on startup and initiate autonomous live mandi sync daemon."""
    print("[ML Service] Starting up — loading advanced quantile models...")
    loaded = load_models()
    if not loaded:
        print("[ML Service] Models not found — endpoints will use microeconomic fallback")
        print("[ML Service] Run 'python -m app.training.train' to train models")

    # Start background live mandi sync daemon (runs every 6 hours)
    sync_task = asyncio.create_task(live_sync_daemon_loop(interval_hours=6.0))
    yield
    print("[ML Service] Shutting down — cancelling live sync daemon")
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass
    print("[ML Service] Shutdown complete")


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
            current_price_per_kg=req.current_price_per_kg,
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
            current_price_per_kg=req.current_price_per_kg,
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


# ─── MLOps Governance & Drift Engine ─────────────────────────────────────────

@app.get("/mlops/status")
def mlops_status():
    """Return model registry status, active champion metrics, and lineage history."""
    meta = get_active_model_metadata()
    return {
        "status": "online",
        "models_loaded": are_models_loaded(),
        "active_champion": meta,
        "feature_count": meta.get("feature_count", 102),
        "trained_records": meta.get("trained_records", 312000),
    }


@app.get("/mlops/drift")
def mlops_drift():
    """Detect Population Stability Index (PSI) and Kolmogorov-Smirnov distribution drift."""
    try:
        report = evaluate_system_drift()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drift evaluation failed: {str(e)}")


@app.post("/mlops/retrain")
def mlops_retrain():
    """Trigger automated Champion vs. Challenger retraining cycle."""
    try:
        result = run_champion_challenger_cycle()
        if result.get("decision") == "PROMOTED":
            load_models()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining cycle failed: {str(e)}")


@app.post("/mlops/rollback")
def mlops_rollback():
    """Roll back to the previous champion model artifact."""
    try:
        result = rollback_champion()
        load_models()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rollback failed: {str(e)}")


@app.post("/mlops/sync-live-data")
async def mlops_sync_live(background_tasks: BackgroundTasks):
    """
    Triggers an immediate live data synchronization from api.data.gov.in (Agmarknet).
    Updates rolling market state and sends an alert.
    """
    try:
        # Run sync in background or wait for it
        result = await run_sync_in_background()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live sync failed: {str(e)}")


@app.get("/mlops/live-state")
def mlops_get_live_state():
    """Returns the currently active live market state with all commodity spot rates."""
    return get_live_market_state()

