/**
 * SasyaVahini — ML & Market Intelligence Controller
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 5 (AI Demand Forecasting & Pricing Intelligence)
 */

const mlService = require('../services/ml.service');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /api/forecast/health or /api/ml/health
 */
async function getHealth(req, res, next) {
  try {
    const health = await mlService.checkHealth();
    return sendSuccess(res, health);
  } catch (err) {
    logger.error('ML Controller health check error', { error: err.message });
    return next(err);
  }
}

/**
 * POST /api/forecast/demand or /api/ml/predict-demand
 */
async function predictDemand(req, res, next) {
  try {
    const result = await mlService.predictDemand(req.body);
    return sendSuccess(res, result);
  } catch (err) {
    logger.error('ML Controller predictDemand error', { error: err.message });
    return next(err);
  }
}

/**
 * POST /api/forecast/price or /api/ml/recommend-price
 */
async function recommendPrice(req, res, next) {
  try {
    const result = await mlService.recommendPrice(req.body);
    return sendSuccess(res, result);
  } catch (err) {
    logger.error('ML Controller recommendPrice error', { error: err.message });
    return next(err);
  }
}

module.exports = {
  getHealth,
  predictDemand,
  recommendPrice,
};

