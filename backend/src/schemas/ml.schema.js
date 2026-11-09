/**
 * SasyaVahini — Zod Validation Schemas for ML & Market Intelligence Endpoints
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 5 (AI Demand Forecasting & Pricing Intelligence)
 */

const { z } = require('zod');

const demandForecastSchema = z.object({
  crop: z.string().min(1, 'Crop name is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  month: z.number().int().min(1).max(12).optional(),
  season: z.enum(['Kharif', 'Rabi', 'Zaid']).optional(),
  festival_period: z.boolean().optional().default(false),
  previous_demand_kg: z.number().nonnegative().optional(),
  current_supply_kg: z.number().nonnegative().optional(),
  temperature_celsius: z.number().optional(),
});

const priceRecommendSchema = z.object({
  crop: z.string().min(1, 'Crop name is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  quantity_kg: z.number().positive('Quantity must be greater than 0'),
  current_supply_kg: z.number().nonnegative().optional(),
  predicted_demand_kg: z.number().nonnegative().optional(),
  historical_price_per_kg: z.number().nonnegative().optional(),
  transit_days: z.number().nonnegative().optional().default(1.5),
});

module.exports = {
  demandForecastSchema,
  priceRecommendSchema,
};

