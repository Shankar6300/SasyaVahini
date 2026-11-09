"""
SasyaVahini ML — Model Evaluation

Provides evaluation utilities for demand forecasting and price recommendation models.
Computes standard regression metrics (MAE, RMSE, R², MAPE) and cross-validation summaries.
"""

from typing import Any, Dict
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def mean_absolute_percentage_error(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Absolute Percentage Error (MAPE), handling zero division safely."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = y_true != 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)


def evaluate_regression(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Compute standard regression metrics:
      - MAE: Mean Absolute Error
      - RMSE: Root Mean Squared Error
      - R2: Coefficient of Determination
      - MAPE: Mean Absolute Percentage Error (%)
    """
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    mape = mean_absolute_percentage_error(y_true, y_pred)

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
        "mape_percent": round(mape, 2),
    }


def print_evaluation_report(model_name: str, metrics: Dict[str, Any]) -> None:
    """Print a clean CLI summary of evaluation metrics."""
    print(f"\n--- Evaluation Report: {model_name} ---")
    print(f"  R² Score: {metrics.get('r2', 'N/A')}")
    print(f"  MAE:      {metrics.get('mae', 'N/A')}")
    print(f"  RMSE:     {metrics.get('rmse', 'N/A')}")
    print(f"  MAPE:     {metrics.get('mape_percent', 'N/A')}%")
    print("-" * 40)
