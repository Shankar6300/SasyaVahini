/**
 * SasyaVahini — Zod Request Validation Middleware
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   router.post('/endpoint', validate(MyZodSchema), handler);
 *
 * Validates req.body by default. Pass 'query' or 'params' for other parts.
 */

const { ZodError } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    req[source] = parsed; // Replace with coerced/transformed values
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return next(new ValidationError('Request validation failed', details));
    }
    next(err);
  }
};

module.exports = { validate };
