/**
 * SasyaVahini — ML Controller
 *
 * Handles HTTP requests for ML-driven demand forecasting,
 * price recommendations, and forecast history.
 * Calls ml.service.js.
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

const mlService = require('../services/ml.service');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');

/**
 * GET /api/ml/demand-forecast or POST /api/ml/demand-forecast
 * Predict demand for a crop in a given district/state.
 */
const getDemandForecast = async (req, res, next) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const result = await mlService.getDemandForecast(params);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ml/price-recommend
 * Get an ML-based price recommendation based on current/predicted market conditions.
 */
const recommendPrice = async (req, res, next) => {
  try {
    const result = await mlService.getPriceRecommendation(req.body);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ml/forecast/history
 * Fetch historical cached demand forecasts from PostgreSQL with pagination.
 */
const getForecastHistory = async (req, res, next) => {
  try {
    const { crop, district, page = 1, limit = 20 } = req.query;
    const { forecasts, total, page: currPage, limit: currLimit } =
      await mlService.getForecastHistory({
        crop,
        district,
        page: Number(page),
        limit: Number(limit),
      });

    return sendSuccess(
      res,
      { forecasts },
      200,
      buildPaginationMeta(total, currPage, currLimit)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ml/health
 * Check the health and reachability of the Python ML FastAPI service.
 */
const checkHealth = async (_req, res, next) => {
  try {
    const health = await mlService.checkMLServiceHealth();
    return sendSuccess(res, health);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDemandForecast,
  recommendPrice,
  getForecastHistory,
  checkHealth,
};
