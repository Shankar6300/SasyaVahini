/**
 * SasyaVahini — Authentication & Authorization Middleware
 *
 * TOKEN LIFECYCLE:
 *   Access token:  Short-lived JWT (15 min default). Sent in Authorization header.
 *   Refresh token: Long-lived JWT (7 days default). Stored as httpOnly cookie
 *                  OR returned in body for non-browser clients.
 *                  Hash stored in DB (RefreshToken model).
 *
 * REFRESH TOKEN ROTATION:
 *   On POST /api/auth/refresh, the old token is validated, then:
 *   1. Old DB record is marked revoked (revokedAt = now).
 *   2. New access + refresh pair is issued.
 *   3. New refresh token hash is stored.
 *   This prevents reuse of stolen refresh tokens.
 *
 * USAGE:
 *   router.get('/protected', authenticate, requireRole('FARMER'), handler);
 *   router.get('/admin', authenticate, requireRole(['ADMIN']), handler);
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Verify access token and attach decoded user payload to req.user.
 * Throws AuthenticationError if token is missing, malformed, or expired.
 */
const authenticate = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No Bearer token provided');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach minimal user info to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      status: payload.status,
    };

    next();
  } catch (err) {
    if (err instanceof AuthenticationError) return next(err);
    if (err.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Access token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid access token'));
    }
    next(err);
  }
};

/**
 * Require the authenticated user to have one of the specified roles.
 * Must be used AFTER `authenticate`.
 *
 * @param {string | string[]} roles - Allowed role(s).
 */
const requireRole = (roles) => (req, _res, next) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!req.user) {
    return next(new AuthenticationError());
  }
  if (!allowed.includes(req.user.role)) {
    logger.warn('Authorization denied', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRoles: allowed,
      path: req.path,
    });
    return next(new AuthorizationError(`This endpoint requires role: ${allowed.join(' or ')}`));
  }
  next();
};

/**
 * Require the authenticated user to own the resource.
 * `getOwnerId` is a function(req) → string that returns the expected owner ID.
 * Admins always pass.
 */
const requireOwnerOrAdmin = (getOwnerId) => (req, _res, next) => {
  if (!req.user) return next(new AuthenticationError());
  if (req.user.role === 'ADMIN') return next();
  const ownerId = getOwnerId(req);
  if (req.user.id !== ownerId) {
    return next(new AuthorizationError('You do not own this resource'));
  }
  next();
};

module.exports = { authenticate, requireRole, requireOwnerOrAdmin };
