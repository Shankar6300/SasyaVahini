"""
SasyaVahini ML Service — Configuration

Loads settings from environment variables with sensible defaults.
All service-level config lives here so modules don't scatter os.getenv() calls.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root if present
_project_root = Path(__file__).resolve().parent.parent.parent  # SasyaVahini/
load_dotenv(_project_root / ".env", override=False)

# ── Paths ────────────────────────────────────────────────────────────────────
APP_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = APP_DIR / "artifacts"
DATA_DIR = APP_DIR / "data"

# Ensure directories exist
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Model file paths ────────────────────────────────────────────────────────
DEMAND_MODEL_PATH = ARTIFACTS_DIR / "demand_model.joblib"
PRICE_MODEL_PATH = ARTIFACTS_DIR / "price_model.joblib"
FEATURE_COLUMNS_PATH = ARTIFACTS_DIR / "feature_columns.joblib"
MODEL_METADATA_PATH = ARTIFACTS_DIR / "model_metadata.joblib"

# ── Service settings ────────────────────────────────────────────────────────
SERVICE_HOST = os.getenv("ML_HOST", "0.0.0.0")
SERVICE_PORT = int(os.getenv("ML_PORT", "8000"))
CORS_ORIGINS = os.getenv("ML_CORS_ORIGINS", "http://localhost:5000,http://localhost:5173").split(",")

# ── Model defaults ──────────────────────────────────────────────────────────
MODEL_VERSION = "0.1.0-synthetic"  # Updated when retrained with real data
