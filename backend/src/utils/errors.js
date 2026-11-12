/**
 * SasyaVahini — Application Error Classes
 *
 * Throw these inside controllers/services. The global error handler will
 * catch them and return the correct HTTP status + error code automatically.
 */

class AppError extends Error {
  /**
   * @param {string} message - Human-readable message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} code - Machine-readable error code.
   * @param {any} [details] - Optional extra details (e.g. validation errors).
   */
  constructor(message, statusCode, code, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 422, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTHENTICATION_ERROR') {
    super(message, 401, code);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class BusinessRuleError extends AppError {
  constructor(message, code = 'BUSINESS_RULE_VIOLATION') {
    super(message, 422, code);
    this.name = 'BusinessRuleError';
  }
}

class OperationalError extends AppError {
  constructor(message = 'Operational error occurred', statusCode = 500, code = 'OPERATIONAL_ERROR', details = undefined) {
    super(message, statusCode, code, details);
    this.name = 'OperationalError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please slow down.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  OperationalError,
  RateLimitError,
};
