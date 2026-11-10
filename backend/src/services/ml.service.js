/**
 * SasyaVahini — ML & Market Intelligence Service
 *
 * Communicates with the FastAPI Agricultural Intelligence engine (port 8000)
 * serving multi-horizon quantile demand predictions and price elasticity models.
 * Includes graceful microeconomic fallback if ML service is unreachable.
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 5 (AI Demand Forecasting & Pricing Intelligence)
 */

const logger = require('../utils/logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Fallback baseline modal prices (₹/kg) across common Indian staple crops
const BASELINE_PRICES = {
  tomato: 26.50,
  onion: 32.00,
  potato: 22.00,
  wheat: 24.50,
  rice: 36.00,
  soybean: 48.00,
  cotton: 62.00,
  chili: 95.00,
  garlic: 120.00,
  ginger: 80.00,
  cabbage: 18.00,
  cauliflower: 24.00,
};

/**
 * Check ML Service Health
 */
async function checkHealth() {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
    return { status: 'degraded', models_loaded: false, service: 'FastAPI ML Service returned non-200' };
  } catch (err) {
    logger.warn(`ML Service health check failed (${err.message}) — using microeconomic fallback`);
    return {
      status: 'fallback',
      models_loaded: false,
      service: 'FastAPI Offline — In-memory Microeconomic Fallback Active',
    };
  }
}

function normalizeMLPayload(payload) {
  return {
    ...payload,
    district: payload.district || payload.location || 'Pune',
    state: payload.state || 'Maharashtra',
    quantity_kg: Number(payload.quantity_kg || payload.quantity || 1000),
  };
}

/**
 * Predict regional crop demand with multi-horizon uncertainty
 */
async function predictDemand(rawPayload) {
  const payload = normalizeMLPayload(rawPayload);
  try {
    const res = await fetch(`${ML_SERVICE_URL}/predict-demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    logger.warn(`FastAPI /predict-demand returned ${res.status}: ${errText}`);
  } catch (err) {
    logger.warn(`FastAPI unreachable (${err.message}) — executing fallback demand prediction`);
  }

  // Graceful rule-based microeconomic fallback
  return generateFallbackDemand(payload);
}

/**
 * Recommend fair listing price grounded in price elasticity and decay discounting
 */
async function recommendPrice(rawPayload) {
  const payload = normalizeMLPayload(rawPayload);
  try {
    const res = await fetch(`${ML_SERVICE_URL}/recommend-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const minP = data.price_range_min || (data.recommended_price_per_kg * 0.9);
      const maxP = data.price_range_max || (data.recommended_price_per_kg * 1.15);
      return {
        ...data,
        // Provide backwards-compatible field aliases for frontend components
        recommended_price: data.recommended_price_per_kg,
        min_price: minP,
        max_price: maxP,
        market_range: `₹${minP.toFixed(1)} - ₹${maxP.toFixed(1)}/kg`,
      };
    }
    const errText = await res.text();
    logger.warn(`FastAPI /recommend-price returned ${res.status}: ${errText}`);
  } catch (err) {
    logger.warn(`FastAPI unreachable (${err.message}) — executing fallback price recommendation`);
  }

  return generateFallbackPrice(payload);
}

// ─── Rule-based Microeconomic Fallbacks ───────────────────────────────────────

function generateFallbackDemand(payload) {
  const cropLower = (payload.crop || 'Tomato').toLowerCase();
  const baseModal = BASELINE_PRICES[cropLower] || 25.0;
  const currentSupply = payload.current_supply_kg || 30000;
  const festivalMultiplier = payload.festival_period ? 1.25 : 1.0;
  
  const p50 = Math.round(currentSupply * 1.15 * festivalMultiplier);
  const p10 = Math.round(p50 * 0.85);
  const p90 = Math.round(p50 * 1.20);
  const demandGap = p50 - currentSupply;

  const now = new Date();
  const trajectory = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const dayFactor = 1.0 + 0.03 * Math.sin((i / 7) * Math.PI * 2);
    trajectory.push({
      day: i,
      date: d.toISOString().split('T')[0],
      p10_kg: Math.round(p10 * dayFactor),
      p50_kg: Math.round(p50 * dayFactor),
      p90_kg: Math.round(p90 * dayFactor),
      expected_price_per_kg: Number((baseModal * (p50 / Math.max(1, currentSupply * dayFactor)) * 0.95).toFixed(2)),
    });
  }

  return {
    crop: payload.crop,
    district: payload.district,
    state: payload.state,
    predicted_demand_kg: p50,
    demand_p10_kg: p10,
    demand_p90_kg: p90,
    current_supply_kg: currentSupply,
    demand_gap_kg: demandGap,
    demand_level: demandGap > 5000 ? 'HIGH' : (demandGap < -5000 ? 'LOW' : 'MEDIUM'),
    recommended_price_per_kg: baseModal,
    price_elasticity: -0.55,
    confidence_score: 0.82,
    daily_trajectory: trajectory,
    arbitrage_advisory: {
      origin_mandi: `${payload.district} APMC`,
      recommended_mandi: `Vashi APMC (Navi Mumbai)`,
      origin_modal_price: baseModal,
      target_modal_price: Number((baseModal * 1.22).toFixed(2)),
      freight_cost_per_kg: 2.80,
      net_arbitrage_gain_per_kg: Number((baseModal * 0.22 - 2.80).toFixed(2)),
      distance_km: 140,
      signal: baseModal * 0.22 - 2.80 > 1.5 ? 'STRONG_ARBITRAGE' : 'SELL_LOCAL',
    },
    model_version: 'v1.0-fallback-microeconomic',
    is_fallback: true,
    explanations: [
      `Regional baseline estimated from Agmarknet modal clearing standard for ${payload.crop}.`,
      payload.festival_period ? 'Festival multiplier applied (+25% consumption appetite).' : 'Normal non-festival consumption baseline.',
    ],
  };
}

function generateFallbackPrice(payload) {
  const cropLower = (payload.crop || 'Tomato').toLowerCase();
  const baseModal = BASELINE_PRICES[cropLower] || 25.0;
  const transitDays = payload.transit_days || 1.5;
  const decayDiscount = Math.min(baseModal * 0.15, transitDays * 0.8);
  const recPrice = Math.max(8.0, Number((baseModal - decayDiscount).toFixed(2)));

  return {
    crop: payload.crop,
    district: payload.district,
    recommended_price_per_kg: recPrice,
    recommended_price: recPrice, // Frontend compatibility alias
    price_range_min: Number((recPrice * 0.90).toFixed(2)),
    price_range_max: Number((recPrice * 1.12).toFixed(2)),
    currency: 'INR',
    elasticity_coefficient: -0.55,
    market_clearing_volume_kg: payload.quantity_kg,
    spoilage_adjusted_gate_price: recPrice,
    explanations: [
      `Base modal clearing benchmark: ₹${baseModal}/kg for ${payload.crop}.`,
      `Transit decay deduction: ₹${decayDiscount.toFixed(2)}/kg for ${transitDays} days transit.`,
    ],
    model_version: 'v1.0-fallback-microeconomic',
    is_fallback: true,
  };
}

module.exports = {
  checkHealth,
  predictDemand,
  recommendPrice,
};

