/**
 * SasyaVahini — ML Validation Schemas (Zod)
 *
 * Request validation for demand forecasting and price recommendation endpoints.
 * Follows the same validation pattern used throughout the project (auth.schema.js).
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

const { z } = require('zod');

// ─── Known values (match the ML service's feature engineering catalogs) ──────

const KNOWN_CROPS = [
  'Tomato', 'Onion', 'Potato', 'Wheat', 'Rice', 'Grapes',
  'Pomegranate', 'Soybean', 'Maize', 'Sugarcane', 'Cotton',
  'Chilli', 'Brinjal', 'Cauliflower', 'Cabbage', 'Banana',
];

const KNOWN_SEASONS = ['Kharif', 'Rabi', 'Zaid'];

// ─── Demand Forecast Query ──────────────────────────────────────────────────

const demandForecastQuerySchema = z.object({
  crop: z
    .string()
    .min(2, 'Crop name must be at least 2 characters')
    .max(50, 'Crop name too long'),
  district: z
    .string()
    .min(2, 'District name must be at least 2 characters')
    .max(50, 'District name too long'),
  state: z
    .string()
    .min(2, 'State name must be at least 2 characters')
    .max(50, 'State name too long')
    .default('Maharashtra'),
  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(),
  season: z
    .enum(KNOWN_SEASONS)
    .optional(),
  festivalPeriod: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
  previousDemandKg: z.coerce
    .number()
    .min(0)
    .optional(),
  currentSupplyKg: z.coerce
    .number()
    .min(0)
    .optional(),
  temperatureCelsius: z.coerce
    .number()
    .optional(),
});

// ─── Demand Forecast POST Body ──────────────────────────────────────────────

const demandForecastBodySchema = z.object({
  crop: z
    .string()
    .min(2, 'Crop name must be at least 2 characters')
    .max(50),
  district: z
    .string()
    .min(2, 'District name must be at least 2 characters')
    .max(50),
  state: z
    .string()
    .min(2)
    .max(50)
    .default('Maharashtra'),
  month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(),
  season: z
    .enum(KNOWN_SEASONS)
    .optional(),
  festivalPeriod: z
    .boolean()
    .optional()
    .default(false),
  previousDemandKg: z
    .number()
    .min(0)
    .optional(),
  currentSupplyKg: z
    .number()
    .min(0)
    .optional(),
  temperatureCelsius: z
    .number()
    .optional(),
});

// ─── Price Recommendation ───────────────────────────────────────────────────

const priceRecommendBodySchema = z.object({
  crop: z.string().min(2).max(50),
  district: z.string().min(2).max(50),
  state: z.string().min(2).max(50).default('Maharashtra'),
  quantityKg: z.number().positive('Quantity must be positive'),
  currentSupplyKg: z.number().min(0).optional(),
  predictedDemandKg: z.number().min(0).optional(),
  historicalPricePerKg: z.number().min(0).optional(),
});

// ─── Forecast History Query ─────────────────────────────────────────────────

const forecastHistoryQuerySchema = z.object({
  crop: z.string().min(2).max(50).optional(),
  district: z.string().min(2).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

module.exports = {
  demandForecastQuerySchema,
  demandForecastBodySchema,
  priceRecommendBodySchema,
  forecastHistoryQuerySchema,
  KNOWN_CROPS,
  KNOWN_SEASONS,
};
