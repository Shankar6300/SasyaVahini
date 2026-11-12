/**
 * SasyaVahini — Express Application
 * Configures all middleware, routes, and error handling.
 * Entry point: src/index.js
 *
 * Owner: Member 1
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: false });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

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
const mlRoutes = require('./routes/ml.routes');

const app = express();

// Trust reverse proxy (Nginx) so client IP is accurately extracted from X-Forwarded-For
app.set('trust proxy', 1);

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

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
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // High threshold allowing user registration & logins without 429 lockouts
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
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

// Member 2 Routes: Farmer & FPO
app.use('/api/farmers', require('./routes/farmer.routes'));
app.use('/api/fpo', require('./routes/fpo.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/tts', require('./routes/tts.routes'));

// Member 3 Routes: Buyer & Marketplace
app.use('/api/marketplace', require('./routes/marketplace.routes'));
app.use('/api/buyer/marketplace', require('./routes/marketplace.routes'));
app.use('/api/buyer', require('./routes/buyer.routes'));

// Member 4 Routes: Logistics
app.use('/api/logistics', require('./routes/logistics.routes'));

// Member 5 Routes: AI Demand Forecasting & Pricing Intelligence
app.use('/api/ml', mlRoutes);
app.use('/api/forecast', mlRoutes);

// RBAC demo / stubs for remaining roles (buyer, admin)
app.use('/api', roleDemoRoutes);
// app.use('/api/notifications', require('./routes/notification.routes'));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
