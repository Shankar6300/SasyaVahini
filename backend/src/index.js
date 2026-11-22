/**
 * SasyaVahini — Server Entry Point
 *
 * Starts the Express HTTP server and handles graceful shutdown.
 */

const app = require('./app');
const logger = require('./utils/logger');
const prisma = require('./lib/prisma');
const proposalExpiryService = require('./services/proposalExpiry.service');

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = app.listen(PORT, () => {
  logger.info(`🌱 SasyaVahini API server started`, {
    port: PORT,
    env: process.env.NODE_ENV,
    url: `http://localhost:${PORT}`,
    health: `http://localhost:${PORT}/api/health`,
  });
});

// ─── Background 30-min Proposal Expiry Sweeper ────────────────────────────────
const sweeperInterval = setInterval(() => {
  proposalExpiryService.sweepExpiredProposals().catch((err) => {
    logger.warn('Background proposal sweep error:', err.message);
  });
}, 60000);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  clearInterval(sweeperInterval);
  if (server && typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed cleanly. Process exiting.');
    } catch (err) {
      logger.warn('Error closing database connection', { error: err.message });
    }
    process.exit(0);
  });

  // Force exit after 10 s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced exit after 10 s shutdown timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});
