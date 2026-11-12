/**
 * SasyaVahini — ML & Market Intelligence Routes
 *
 * Exposes AI demand forecasts, price recommendations, and APMC arbitrage advisories.
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 5 (AI Demand Forecasting & Pricing Intelligence)
 */

const express = require('express');
const router = express.Router();

const mlController = require('../controllers/ml.controller');
const { validate } = require('../middleware/validate');
const { demandForecastSchema, priceRecommendSchema } = require('../schemas/ml.schema');

// Health check
router.get('/health', mlController.getHealth);

// Demand Forecasting
router.post('/demand', validate(demandForecastSchema), mlController.predictDemand);
router.post('/predict-demand', validate(demandForecastSchema), mlController.predictDemand);

// Price Recommendation
router.post('/price', validate(priceRecommendSchema), mlController.recommendPrice);
router.post('/recommend-price', validate(priceRecommendSchema), mlController.recommendPrice);

// MLOps Governance & Drift Engine
router.get('/mlops/status', mlController.getMLOpsStatus);
router.get('/mlops/drift', mlController.getMLOpsDrift);
router.post('/mlops/retrain', mlController.retrainModel);
router.post('/mlops/rollback', mlController.rollbackModel);
router.post('/mlops/sync-live-data', mlController.syncLiveData);
router.get('/mlops/live-state', mlController.getLiveState);

module.exports = router;

