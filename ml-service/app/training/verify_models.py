"""
SasyaVahini ML - Model Verification Script
Validates that newly trained Agmarknet models load properly and output realistic predictions.
"""

from app.models.demand_model import load_models, predict_demand, predict_price, get_model_metadata

loaded = load_models()
print(f"Models loaded: {loaded}")

meta = get_model_metadata()
print(f"Algorithm: {meta.get('algorithm')}")
print(f"Data source: {meta.get('data_source')}")
print(f"Train samples: {meta.get('num_train_samples')} | Test samples: {meta.get('num_test_samples')}")
print(f"Test Price R2: {meta.get('test_price_r2')} | Test MAE: Rs. {meta.get('test_price_mae')}/kg | MAPE: {meta.get('test_price_mape')}%")
print(f"Test Coverage (80% target): {meta.get('test_coverage_80pct')}%")

# Test 1: Tomato in Pune
res = predict_demand(crop="Tomato", district="Pune", state="Maharashtra", current_supply_kg=15000)
print("\n--- Tomato in Pune Forecast ---")
print(f"Predicted Median (P50): {res['predicted_demand_kg']} kg")
print(f"Uncertainty Band [P10 - P90]: [{res['demand_p10_kg']} kg - {res['demand_p90_kg']} kg]")
print(f"Recommended Price: Rs. {res['recommended_price_per_kg']}/kg")
print(f"Demand Gap: {res['demand_gap_kg']} kg ({res['demand_level']})")
print(f"Arbitrage Signal: {res['arbitrage_advisory']['signal']} -> {res['arbitrage_advisory']['recommended_mandi']}")
print(f"Explanations: {res['explanations']}")

# Test 2: Onion in Nashik
res2 = predict_price(crop="Onion", district="Nashik", state="Maharashtra", quantity_kg=5000)
print("\n--- Onion in Nashik Price Clearance ---")
print(f"Recommended Price: Rs. {res2['recommended_price_per_kg']}/kg (Range: Rs. {res2['price_range_min']} - {res2['price_range_max']})")
print(f"Market Clearing Volume: {res2['market_clearing_volume_kg']} kg")
print(f"Explanations: {res2['explanations']}")
