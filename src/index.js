/**
 * Entry point — Online Bookstore RESTful API Server
 *
 * Registers all v1 routes, global middleware, and starts listening.
 *
 * Base URL:  http://localhost:3000
 * API Docs:  GET /
 */

'use strict';

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(express.json());

// Attach a correlation ID to every request for traceability
app.use((req, _res, next) => {
  req.requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  next();
});

// ── Route Imports ─────────────────────────────────────────────────────────────
const booksRouter = require('./routes/books');
const ordersRouter = require('./routes/orders');

// ── Mount Versioned Routes ────────────────────────────────────────────────────
app.use('/v1/books', booksRouter);
app.use('/v1/orders', ordersRouter);

// The sub-resource /v1/users/:userId/orders is delegated from the orders router
app.use('/v1', ordersRouter);

// ── Root — API Info ───────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'Online Bookstore RESTful API',
    version: 'v1',
    description: 'Backend Assignment — Intro to Backend (Raja Software)',
    endpoints: {
      books: {
        'GET /v1/books':        'Fetch list of all books (filterable, paginated)',
        'GET /v1/books/:id':    'Fetch details of a specific book by ID',
        'POST /v1/books':       'Add a new book (admin token required)',
        'PATCH /v1/books/:id':  'Update price of an existing book (admin token required)',
        'DELETE /v1/books/:id': 'Delete a book record (admin token required)',
      },
      orders: {
        'POST /v1/orders':                  'Place a new book order (auth token required)',
        'GET /v1/users/:userId/orders':     'Retrieve all orders for a specific user (auth required)',
      },
    },
    demoTokens: {
      customer: 'demo-token-jane  (userId: usr_8a9f7d10)',
      admin:    'demo-token-admin (userId: usr_admin01)',
    },
  });
});

// ── 404 Catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    type: 'https://api.bookstore.example.com/errors/not-found',
    title: 'Not Found',
    status: 404,
    errorCode: 'ROUTE_NOT_FOUND',
    detail: `The requested route '${req.method} ${req.path}' does not exist.`,
    instance: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({
    type: 'https://api.bookstore.example.com/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    detail: 'An unexpected error occurred. Please try again later.',
    instance: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Online Bookstore API — Server Running            ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Base URL : http://localhost:${PORT}                   ║`);
  console.log(`║  API Root : http://localhost:${PORT}/                  ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Demo Tokens:');
  console.log('  Customer : Authorization: Bearer demo-token-jane');
  console.log('  Admin    : Authorization: Bearer demo-token-admin');
  console.log('');
});

module.exports = app; // exported for testing
