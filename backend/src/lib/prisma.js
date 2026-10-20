/**
 * SasyaVahini — Prisma Client Singleton
 *
 * Import this module wherever database access is needed.
 * A single PrismaClient instance is reused across hot-reloads in dev.
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Log slow queries in development
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn('Slow Prisma query', { query: e.query, duration: `${e.duration}ms` });
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error', { message: e.message });
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
