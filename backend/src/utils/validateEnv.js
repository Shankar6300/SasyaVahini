/**
 * SasyaVahini — Environment Variable Validation
 *
 * Called at startup. If a required variable is missing the process exits
 * immediately rather than failing silently at runtime.
 */
const logger = require('./logger');

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const OPTIONAL_WITH_DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '5000',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  LOG_LEVEL: 'info',
  ML_SERVICE_URL: 'http://127.0.0.1:8000',
  ML_SERVICE_TIMEOUT_MS: '5000',
  ENABLE_REAL_OTP: 'false',
  OTP_EXPIRY_SECONDS: '300',
};

function validateEnv() {
  const missing = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error('Missing required environment variables. Refusing to start.', { missing });
    logger.error('Copy .env.example to .env and fill in the missing values.');
    process.exit(1);
  }

  // Apply defaults for optional vars
  for (const [key, defaultValue] of Object.entries(OPTIONAL_WITH_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  logger.info('Environment variables validated.', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  });
}

module.exports = { validateEnv };
