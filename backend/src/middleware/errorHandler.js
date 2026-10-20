/**
 * SasyaVahini — Global Error Handler
 *
 * Must be registered as the LAST middleware in Express (4 arguments).
 * Catches all thrown errors and converts them to consistent API responses.
 */

const { AppError } = require('../utils/errors');
const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log the full error internally
  logger.error('Unhandled error', {
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    return sendError(
      res,
      err.code,
      err.message,
      err.statusCode,
      err.details,
    );
  }

  // Prisma-specific errors
  if (err.code === 'P2002') {
    return sendError(res, 'CONFLICT', 'A record with this value already exists.', 409);
  }
  if (err.code === 'P2025') {
    return sendError(res, 'NOT_FOUND', 'The requested record was not found.', 404);
  }

  // Unknown / unhandled errors
  const isProduction = process.env.NODE_ENV === 'production';
  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    isProduction ? 'An internal server error occurred.' : err.message,
    500,
    isProduction ? undefined : err.stack,
  );
};

module.exports = { errorHandler };
