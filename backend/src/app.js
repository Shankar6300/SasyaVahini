/**
 * SasyaVahini — Express Application
 * Configures all middleware, routes, and error handling.
 * Entry point: src/index.js
 *
 * Owner: Member 1
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { validateEnv } = require('./utils/validateEnv');
validateEnv(); // Exit immediately if required env vars are missing

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { sendSuccess, sendError } = require('./utils/apiResponse');
const prisma = require('./lib/prisma');

// Routes
const authRoutes = require('./routes/auth.routes');
const roleDemoRoutes = require('./routes/roleDemo.routes');

const app = express();

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy does not allow origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for auth
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many auth requests' } },
});

app.use(globalLimiter);

// ─── Request parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP request logging ─────────────────────────────────────────────────────
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, {
      status: 'ok',
      system: 'SasyaVahini API',
      version: '1.0.0',
      database: 'connected',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Health check: DB connection failed', { error: err.message });
    return sendError(res, 'DB_UNAVAILABLE', 'Database connection failed', 503, {
      database: 'disconnected',
    });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', roleDemoRoutes); // RBAC demo — /api/farmer/dashboard, /api/admin/dashboard, etc.

// Future routes (registered by members in feature branches):
// app.use('/api/farmers', require('./routes/farmer.routes'));
// app.use('/api/fpo', require('./routes/fpo.routes'));
// app.use('/api/buyers', require('./routes/buyer.routes'));
// app.use('/api/marketplace', require('./routes/marketplace.routes'));
// app.use('/api/orders', require('./routes/order.routes'));
// app.use('/api/logistics', require('./routes/logistics.routes'));
// app.use('/api/ml', require('./routes/ml.routes'));
// app.use('/api/admin', require('./routes/admin.routes'));
// app.use('/api/notifications', require('./routes/notification.routes'));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
