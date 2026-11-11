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
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(', ')
      : String(err.meta?.target || '');
    let friendlyMessage = 'A record with this value already exists.';
    if (target.includes('vehicleNumber')) {
      friendlyMessage = 'This vehicle registration number is already registered in the system. Please enter your unique vehicle number.';
    } else if (target.includes('email')) {
      friendlyMessage = 'This email address is already registered. Please sign in or use a different email.';
    } else if (target.includes('phone')) {
      friendlyMessage = 'This phone number is already registered. Please sign in or use a different phone number.';
    } else if (target) {
      friendlyMessage = `A record with this ${target} already exists.`;
    }
    return sendError(res, 'CONFLICT', friendlyMessage, 409, { target: err.meta?.target });
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
