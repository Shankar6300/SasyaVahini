/**
 * SasyaVahini — Prisma Client Singleton & PostgreSQL Connection Resiliency
 *
 * Provides connection pooling, graceful reconnection, and automatic retry
 * for transient database interruptions (e.g. SQLSTATE 57P01 / E57P01 admin_shutdown,
 * Docker container restarts, and administrative connection termination).
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const globalForPrisma = global;

/**
 * Identify transient PostgreSQL and network connection errors that should be retried.
 * - SQLSTATE 57P01 / E57P01: admin_shutdown / terminating connection due to administrator command
 * - P1001: Can't reach database server
 * - P1002: Database server reached but timed out
 * - P1017: Server closed the connection
 * - ECONNRESET / ETIMEDOUT / closed connection unexpectedly
 */
const isTransientDbError = (err) => {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '');
  return (
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1017' ||
    code === '57P01' ||
    code === 'E57P01' ||
    msg.includes('57p01') ||
    msg.includes('admin_shutdown') ||
    msg.includes('administrator command') ||
    msg.includes('server closed the connection') ||
    msg.includes('connection terminated') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
};

const basePrisma =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Log slow queries in development
if (process.env.NODE_ENV !== 'production') {
  basePrisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn('Slow Prisma query', { query: e.query, duration: `${e.duration}ms` });
    }
  });
}

basePrisma.$on('error', (e) => {
  if (isTransientDbError(e)) {
    logger.warn('PostgreSQL transient connection event', { message: e.message, code: e.code });
  } else {
    logger.error('Prisma error', { message: e.message, code: e.code });
  }
});

// Resiliency extension: retry transient errors with brief backoff and reconnect
const prisma =
  globalForPrisma.prisma ??
  basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return await query(args);
          } catch (err) {
            if (isTransientDbError(err)) {
              logger.warn(
                `Transient PostgreSQL connection interruption (${err.code || '57P01'}) during ${model}.${operation}. Attempting reconnect & retry...`,
                { error: err.message }
              );
              try {
                await basePrisma.$connect();
              } catch (reconnErr) {
                logger.warn('Prisma reconnect attempt error', { error: reconnErr.message });
              }
              // Backoff before single retry
              await new Promise((resolve) => setTimeout(resolve, 300));
              return await query(args);
            }
            throw err;
          }
        },
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBase = basePrisma;
  globalForPrisma.prisma = prisma;
}

/**
 * Helper to execute arbitrary database operations with transient retry.
 */
async function withDbRetry(fn, maxRetries = 2, delayMs = 300) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(prisma);
    } catch (err) {
      lastError = err;
      if (isTransientDbError(err) && attempt < maxRetries) {
        logger.warn(`Retrying database operation after transient error (${attempt}/${maxRetries})`, {
          error: err.message,
        });
        try {
          await basePrisma.$connect();
        } catch {
          // ignore reconnect failure; next attempt will try
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

module.exports = prisma;
module.exports.withDbRetry = withDbRetry;
module.exports.isTransientDbError = isTransientDbError;
