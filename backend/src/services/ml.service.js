/**
 * SasyaVahini — ML Service Client
 *
 * Handles communication between the Express backend and the Python ML service.
 * Responsibilities:
 *   - HTTP proxy to the FastAPI ML service (demand prediction, price recommendation)
 *   - Caching forecast results in the PostgreSQL DemandForecast table
 *   - Graceful error handling when the ML service is unavailable
 *   - Retrieving historical forecasts from the database
 *
 * This service is consumed by ml.controller.js, never called directly by routes.
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

// ─── ML service connection config ───────────────────────────────────────────

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_SERVICE_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT_MS, 10) || 5000;

/**
 * Internal helper: call the ML service via fetch.
 * Returns parsed JSON on success, throws on failure.
 */
async function callMLService(endpoint, payload) {
  const url = `${ML_SERVICE_URL}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_TIMEOUT);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('ML service returned error', {
        endpoint,
        status: response.status,
        body: errorBody,
      });
      throw new AppError(
        `ML service error: ${response.status}`,
        502,
        'ML_SERVICE_ERROR',
      );
    }

    return await response.json();
  } catch (err) {
    if (err instanceof AppError) throw err;

    if (err.name === 'AbortError') {
      logger.warn('ML service request timed out', { endpoint, timeout: ML_SERVICE_TIMEOUT });
      throw new AppError(
        'ML service request timed out',
        504,
        'ML_SERVICE_TIMEOUT',
      );
    }

    logger.error('ML service unavailable', { endpoint, error: err.message });
    throw new AppError(
      'ML service is unavailable — ensure the Python service is running on port 8000',
      503,
      'ML_SERVICE_UNAVAILABLE',
    );
  }
}

// ─── Demand Forecast ────────────────────────────────────────────────────────

/**
 * Get a demand forecast from the ML service and cache it in the database.
 *
 * @param {object} params
 * @param {string} params.crop
 * @param {string} params.district
 * @param {string} params.state
 * @param {number} [params.month]
 * @param {string} [params.season]
 * @param {boolean} [params.festivalPeriod]
 * @param {number} [params.previousDemandKg]
 * @param {number} [params.currentSupplyKg]
 * @param {number} [params.temperatureCelsius]
 * @returns {Promise<object>} Forecast result
 */
async function getDemandForecast(params) {
  // Map camelCase (Node convention) → snake_case (Python convention)
  const mlPayload = {
    crop: params.crop,
    district: params.district,
    state: params.state,
    month: params.month || undefined,
    season: params.season || undefined,
    festival_period: params.festivalPeriod || false,
    previous_demand_kg: params.previousDemandKg || undefined,
    current_supply_kg: params.currentSupplyKg || undefined,
    temperature_celsius: params.temperatureCelsius || undefined,
  };

  const prediction = await callMLService('/predict-demand', mlPayload);

  // Persist to DemandForecast table for historical tracking
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 7); // 7-day forecast window

  try {
    const cached = await prisma.demandForecast.create({
      data: {
        cropName: prediction.crop,
        district: prediction.district,
        state: prediction.state || params.state,
        predictedDemandKg: prediction.predicted_demand_kg,
        currentSupplyKg: prediction.current_supply_kg,
        demandGapKg: prediction.demand_gap_kg,
        demandLevel: prediction.demand_level,
        recommendedPricePerKg: prediction.recommended_price_per_kg,
        confidenceScore: prediction.confidence_score,
        explainabilityJson: {
          explanations: prediction.explanations,
          is_fallback: prediction.is_fallback,
        },
        forecastPeriodStart: now,
        forecastPeriodEnd: periodEnd,
        modelVersion: prediction.model_version,
      },
    });

    logger.info('Demand forecast cached', {
      id: cached.id,
      crop: cached.cropName,
      district: cached.district,
      demandLevel: cached.demandLevel,
    });

    // Return a response shaped for the frontend
    return {
      id: cached.id,
      crop: cached.cropName,
      district: cached.district,
      state: cached.state,
      predictedDemandKg: cached.predictedDemandKg,
      currentSupplyKg: cached.currentSupplyKg,
      demandGapKg: cached.demandGapKg,
      demandLevel: cached.demandLevel,
      recommendedPricePerKg: cached.recommendedPricePerKg,
      confidenceScore: cached.confidenceScore,
      explanations: prediction.explanations,
      isFallback: prediction.is_fallback,
      modelVersion: cached.modelVersion,
      forecastPeriodStart: cached.forecastPeriodStart,
      forecastPeriodEnd: cached.forecastPeriodEnd,
      createdAt: cached.createdAt,
    };
  } catch (dbErr) {
    // If caching fails, still return the prediction — don't break the UX
    logger.warn('Failed to cache demand forecast in DB', { error: dbErr.message });
    return {
      id: null,
      crop: prediction.crop,
      district: prediction.district,
      state: prediction.state || params.state,
      predictedDemandKg: prediction.predicted_demand_kg,
      currentSupplyKg: prediction.current_supply_kg,
      demandGapKg: prediction.demand_gap_kg,
      demandLevel: prediction.demand_level,
      recommendedPricePerKg: prediction.recommended_price_per_kg,
      confidenceScore: prediction.confidence_score,
      explanations: prediction.explanations,
      isFallback: prediction.is_fallback,
      modelVersion: prediction.model_version,
      forecastPeriodStart: now.toISOString(),
      forecastPeriodEnd: periodEnd.toISOString(),
      createdAt: now.toISOString(),
    };
  }
}

// ─── Price Recommendation ───────────────────────────────────────────────────

/**
 * Get a price recommendation from the ML service.
 */
async function getPriceRecommendation(params) {
  const mlPayload = {
    crop: params.crop,
    district: params.district,
    state: params.state,
    quantity_kg: params.quantityKg,
    current_supply_kg: params.currentSupplyKg || undefined,
    predicted_demand_kg: params.predictedDemandKg || undefined,
    historical_price_per_kg: params.historicalPricePerKg || undefined,
  };

  const result = await callMLService('/recommend-price', mlPayload);

  return {
    crop: result.crop,
    district: result.district,
    recommendedPricePerKg: result.recommended_price_per_kg,
    priceRangeMin: result.price_range_min,
    priceRangeMax: result.price_range_max,
    currency: result.currency,
    explanations: result.explanations,
    isFallback: result.is_fallback,
    modelVersion: result.model_version,
  };
}

// ─── Forecast History ───────────────────────────────────────────────────────

/**
 * Retrieve cached historical forecasts from the database.
 */
async function getForecastHistory({ crop, district, page = 1, limit = 20 }) {
  const where = {};
  if (crop) where.cropName = crop;
  if (district) where.district = district;

  const skip = (page - 1) * limit;

  const [forecasts, total] = await Promise.all([
    prisma.demandForecast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.demandForecast.count({ where }),
  ]);

  return {
    forecasts: forecasts.map((f) => ({
      id: f.id,
      crop: f.cropName,
      district: f.district,
      state: f.state,
      predictedDemandKg: f.predictedDemandKg,
      currentSupplyKg: f.currentSupplyKg,
      demandGapKg: f.demandGapKg,
      demandLevel: f.demandLevel,
      recommendedPricePerKg: f.recommendedPricePerKg,
      confidenceScore: f.confidenceScore,
      explanations: f.explainabilityJson?.explanations || [],
      isFallback: f.explainabilityJson?.is_fallback || false,
      modelVersion: f.modelVersion,
      forecastPeriodStart: f.forecastPeriodStart,
      forecastPeriodEnd: f.forecastPeriodEnd,
      createdAt: f.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── ML Service Health ──────────────────────────────────────────────────────

/**
 * Check if the Python ML service is reachable.
 */
async function checkMLServiceHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
    return { status: 'error', message: `HTTP ${response.status}` };
  } catch {
    return { status: 'offline', message: 'ML service is not reachable' };
  }
}

module.exports = {
  getDemandForecast,
  getPriceRecommendation,
  getForecastHistory,
  checkMLServiceHealth,
};
