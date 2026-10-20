/**
 * SasyaVahini — Consistent API Response Helpers
 *
 * All controllers must use these helpers so the API surface is uniform.
 *
 * Success shape:
 *   { success: true, data: <payload>, meta?: <pagination> }
 *
 * Error shape:
 *   { success: false, error: { code: string, message: string, details?: any } }
 */

/**
 * Send a successful response.
 * @param {import('express').Response} res
 * @param {any} data - Payload to return.
 * @param {number} [statusCode=200]
 * @param {object} [meta] - Optional pagination/meta.
 */
const sendSuccess = (res, data, statusCode = 200, meta = undefined) => {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} code - Machine-readable error code (e.g. "VALIDATION_ERROR").
 * @param {string} message - Human-readable message.
 * @param {number} [statusCode=400]
 * @param {any} [details] - Validation errors, stack trace (dev only), etc.
 */
const sendError = (res, code, message, statusCode = 400, details = undefined) => {
  const body = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return res.status(statusCode).json(body);
};

/**
 * Build pagination meta for list endpoints.
 * @param {number} total - Total records.
 * @param {number} page - Current page (1-indexed).
 * @param {number} limit - Page size.
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

/**
 * Parse and validate pagination query params.
 * Returns { page, limit, skip }.
 */
const parsePagination = (query, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { sendSuccess, sendError, buildPaginationMeta, parsePagination };
