/**
 * Authentication middleware.
 *
 * Validates a Bearer token from the Authorization header.
 * In production this would verify a signed JWT; here it looks up
 * a demo token in the in-memory user store.
 *
 * Usage (protect a route):
 *   router.post('/v1/orders', authenticate, ordersController.place);
 *
 * Usage (restrict to admin):
 *   router.post('/v1/books', authenticate, requireRole('admin'), booksController.add);
 */

const store = require('../data/store');

/**
 * Extracts and validates the Bearer token.
 * Attaches the resolved `user` object to `req.user` on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      type: 'https://api.bookstore.example.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      errorCode: 'MISSING_AUTH_TOKEN',
      detail: 'A valid Bearer token must be provided in the Authorization header.',
      instance: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.slice(7).trim();
  const user = store.getUserByToken(token);

  if (!user) {
    return res.status(401).json({
      type: 'https://api.bookstore.example.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      errorCode: 'INVALID_AUTH_TOKEN',
      detail: 'The provided token is invalid or has expired.',
      instance: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  req.user = user;
  next();
};

/**
 * Role-based access control factory.
 * Returns middleware that enforces the required role.
 * @param {string} role - Required role (e.g. 'admin').
 */
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({
      type: 'https://api.bookstore.example.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      errorCode: 'INSUFFICIENT_PERMISSIONS',
      detail: `This action requires the '${role}' role.`,
      instance: req.path,
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

module.exports = { authenticate, requireRole };
