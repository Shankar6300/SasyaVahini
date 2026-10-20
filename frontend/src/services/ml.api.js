/**
 * SasyaVahini — ML & Mandi Analytics Frontend API Client
 *
 * Client methods for interacting with the backend ML endpoints (/api/ml/*).
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

import api from './api';

/**
 * Fetch demand forecast via query params.
 * @param {object} params
 * @param {string} params.crop
 * @param {string} params.district
 * @param {string} [params.state='Maharashtra']
 * @param {number} [params.month]
 * @param {string} [params.season]
 * @param {boolean} [params.festivalPeriod]
 * @param {number} [params.previousDemandKg]
 * @param {number} [params.currentSupplyKg]
 * @param {number} [params.temperatureCelsius]
 */
export async function getDemandForecast(params) {
  const queryParams = { ...params };
  if (queryParams.festivalPeriod !== undefined) {
    queryParams.festivalPeriod = String(queryParams.festivalPeriod);
  }
  const response = await api.get('/ml/demand-forecast', { params: queryParams });
  return response.data?.data;
}

/**
 * Fetch demand forecast via POST body.
 * @param {object} body
 */
export async function postDemandForecast(body) {
  const response = await api.post('/ml/demand-forecast', body);
  return response.data?.data;
}

/**
 * Request price recommendation.
 * @param {object} body
 * @param {string} body.crop
 * @param {string} body.district
 * @param {string} [body.state='Maharashtra']
 * @param {number} body.quantityKg
 * @param {number} [body.currentSupplyKg]
 * @param {number} [body.predictedDemandKg]
 * @param {number} [body.historicalPricePerKg]
 */
export async function recommendPrice(body) {
  const response = await api.post('/ml/price-recommend', body);
  return response.data?.data;
}

/**
 * Query historical cached forecasts from PostgreSQL.
 * @param {object} [params]
 * @param {string} [params.crop]
 * @param {string} [params.district]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 */
export async function getForecastHistory(params = {}) {
  const response = await api.get('/ml/forecast/history', { params });
  return response.data;
}

/**
 * Check ML microservice status.
 */
export async function checkMLHealth() {
  const response = await api.get('/ml/health');
  return response.data?.data;
}
