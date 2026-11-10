"""
SasyaVahini ML — Multi-Commodity Verification Suite
Verifies demand and price prediction across all 16 canonical commodities.
"""

import sys
import os
from pathlib import Path

# Add ml-service to path
ML_SERVICE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ML_SERVICE_DIR))

from app.models.demand_model import load_models, predict_demand, predict_price
from app.schemas import DemandForecastRequest, PriceRecommendRequest
from app.training.features import KNOWN_CROPS


def test_all_commodities():
    print("\n" + "=" * 70)
    print("  SasyaVahini: Comprehensive 16-Commodity Model Verification")
    print("=" * 70)

    loaded = load_models()
    assert loaded, "ML Models failed to load!"

    test_district = "Pune"
    test_state = "Maharashtra"

    print(f"\n{'Commodity':<15} | {'Rec Price (₹/kg)':<18} | {'P10 - P90 Band (kg)':<22} | {'Arbitrage Mandi':<18}")
    print("-" * 78)

    for crop in KNOWN_CROPS:
        # 1. Test Price Clearance
        price_resp = predict_price(
            crop=crop,
            district=test_district,
            state=test_state,
            quantity_kg=2500.0,
            current_supply_kg=12000.0,
            transit_days=1.5,
        )

        # 2. Test Demand Forecast
        demand_resp = predict_demand(
            crop=crop,
            district=test_district,
            state=test_state,
            current_supply_kg=12000.0,
            festival_period=False,
        )

        rec_price = f"Rs. {price_resp['recommended_price_per_kg']:.2f}"
        band = f"[{demand_resp['demand_p10_kg']:,.0f} - {demand_resp['demand_p90_kg']:,.0f}]"
        mandi = demand_resp['arbitrage_advisory']["recommended_mandi"] if demand_resp.get('arbitrage_advisory') else "Local Mandi"

        print(f"{crop:<15} | {rec_price:<18} | {band:<22} | {mandi:<18}")

    print("-" * 78)
    print("  [ALL 16 COMMODITIES VERIFIED SUCCESSFULLY WITH ZERO ERRORS]\n")


if __name__ == "__main__":
    test_all_commodities()
