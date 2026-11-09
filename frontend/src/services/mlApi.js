/**
 * SasyaVahini — ML & Market Intelligence API Client
 *
 * Frontend service to interact with the AI Demand Forecasting,
 * Price Recommendation, and Mandi Arbitrage APIs.
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 5 (AI Demand Forecasting & Pricing Intelligence)
 */

import api from './api';

/**
 * Fetch 7-day probabilistic demand forecast and mandi arbitrage
 * @param {Object} params
 * @param {string} params.crop - e.g. "Tomato"
 * @param {string} params.district - e.g. "Pune"
 * @param {string} params.state - e.g. "Maharashtra"
 * @param {boolean} [params.festival_period]
 * @param {number} [params.current_supply_kg]
 * @param {number} [params.temperature_celsius]
 */
export async function getDemandForecast(params) {
  const res = await api.post('/forecast/demand', params);
  return res.data?.data || res.data;
}

/**
 * Fetch revenue-maximizing fair listing price and spoilage discount
 * @param {Object} params
 * @param {string} params.crop - e.g. "Tomato"
 * @param {string} params.district - e.g. "Pune"
 * @param {string} params.state - e.g. "Maharashtra"
 * @param {number} params.quantity_kg - e.g. 1500
 * @param {number} [params.transit_days] - e.g. 1.5
 * @param {number} [params.current_supply_kg]
 */
export async function getPriceRecommendation(params) {
  const res = await api.post('/forecast/price', params);
  return res.data?.data || res.data;
}

/**
 * Check ML Service Health
 */
export async function getMLHealth() {
  const res = await api.get('/forecast/health');
  return res.data?.data || res.data;
}

export default {
  getDemandForecast,
  getPriceRecommendation,
  getMLHealth,
};

