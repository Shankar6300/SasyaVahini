/**
 * SasyaVahini — ML & Mandi Advisory Routes
 *
 * Endpoints:
 *   GET  /api/ml/health           — Health check for Python ML microservice
 *   GET  /api/ml/demand-forecast  — Predict crop demand and gap (query params)
 *   POST /api/ml/demand-forecast  — Predict crop demand and gap (JSON body)
 *   POST /api/ml/price-recommend  — Recommend crop pricing (JSON body)
 *   GET  /api/ml/price-forecast   — Alias/contract endpoint for mandi price forecast
 *   GET  /api/ml/forecast/history — Query cached forecast history from DB
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  demandForecastQuerySchema,
  demandForecastBodySchema,
  priceRecommendBodySchema,
  forecastHistoryQuerySchema,
} = require('../schemas/ml.schema');
const controller = require('../controllers/ml.controller');

const router = Router();

/**
 * Optional authentication middleware:
 * Attaches user to req.user if a valid token is provided,
 * but allows unauthenticated access for demo/public mandi checks.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

// ─── Health ─────────────────────────────────────────────────────────────────
router.get('/health', controller.checkHealth);

// ─── Demand Forecasting ─────────────────────────────────────────────────────
router.get(
  '/demand-forecast',
  optionalAuth,
  validate(demandForecastQuerySchema, 'query'),
  controller.getDemandForecast
);

router.post(
  '/demand-forecast',
  optionalAuth,
  validate(demandForecastBodySchema, 'body'),
  controller.getDemandForecast
);

// ─── Price Recommendation ───────────────────────────────────────────────────
router.post(
  '/price-recommend',
  optionalAuth,
  validate(priceRecommendBodySchema, 'body'),
  controller.recommendPrice
);

// Alias to satisfy API_CONTRACT.md /api/ml/price-forecast
router.get(
  '/price-forecast',
  optionalAuth,
  validate(demandForecastQuerySchema, 'query'),
  controller.getDemandForecast
);

// ─── Historical Forecasts ───────────────────────────────────────────────────
router.get(
  '/forecast/history',
  optionalAuth,
  validate(forecastHistoryQuerySchema, 'query'),
  controller.getForecastHistory
);

module.exports = router;
