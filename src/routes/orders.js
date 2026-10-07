/**
 * Orders Router — /v1/orders  &  /v1/users/:userId/orders
 *
 * Implements Task 2 endpoints for purchase management:
 *
 *  POST  /v1/orders                      – Place a new book order (authenticated)
 *  GET   /v1/users/:userId/orders        – Retrieve all orders for a specific user
 *
 * Also demonstrates the full JSON payloads from Task 3.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { authenticate } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────

const problemJson = (res, status, errorCode, title, detail, path, extra = {}) =>
  res.status(status).json({
    type: `https://api.bookstore.example.com/errors/${errorCode.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    errorCode,
    detail,
    instance: path,
    timestamp: new Date().toISOString(),
    requestId: `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    ...extra,
  });

// ── POST /v1/orders ───────────────────────────────────────────────────────────
/**
 * @route   POST /v1/orders
 * @desc    Place a new book order
 * @access  Private (authenticated customer)
 *
 * Task 3 — Success: 201 Created
 * Task 3 — Failure: 409 Conflict (insufficient stock)
 *          Failure: 422 Unprocessable (invalid payload)
 *          Failure: 404 Not Found (unknown bookId)
 */
router.post('/', authenticate, (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  // ── 1. Structural validation ──────────────────────────────────────────────
  const invalidFields = [];

  if (!Array.isArray(items) || items.length === 0) {
    invalidFields.push({
      field: 'items',
      message: 'items must be a non-empty array of order line items.',
    });
  }

  if (!shippingAddress || typeof shippingAddress !== 'object') {
    invalidFields.push({
      field: 'shippingAddress',
      message: 'shippingAddress is required and must be an object.',
    });
  } else {
    const requiredAddressFields = ['recipientName', 'streetLine1', 'city', 'state', 'postalCode', 'country'];
    requiredAddressFields.forEach((f) => {
      if (!shippingAddress[f]) {
        invalidFields.push({ field: `shippingAddress.${f}`, message: `shippingAddress.${f} is required.` });
      }
    });
  }

  if (!paymentMethod || !paymentMethod.type || !paymentMethod.paymentToken) {
    invalidFields.push({
      field: 'paymentMethod',
      message: 'paymentMethod.type and paymentMethod.paymentToken are required.',
    });
  }

  if (invalidFields.length > 0) {
    return problemJson(
      res, 422, 'VALIDATION_FAILED', 'Unprocessable Content',
      'One or more required fields are missing or invalid.',
      req.path,
      { invalidFields },
    );
  }

  // ── 2. Validate each line item & check stock ──────────────────────────────
  const stockConflicts = [];
  const enrichedItems = [];
  let subtotal = 0;

  for (let i = 0; i < items.length; i++) {
    const { bookId, quantity } = items[i];

    // Validate item fields
    if (!bookId || typeof bookId !== 'string') {
      invalidFields.push({
        field: `items[${i}].bookId`,
        rejectedValue: bookId,
        message: `items[${i}].bookId is required and must be a string.`,
      });
      continue;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      invalidFields.push({
        field: `items[${i}].quantity`,
        rejectedValue: quantity,
        message: `items[${i}].quantity must be a positive integer.`,
      });
      continue;
    }

    // Check the book exists
    const book = store.getBookById(bookId);
    if (!book) {
      invalidFields.push({
        field: `items[${i}].bookId`,
        rejectedValue: bookId,
        message: `No book with ID '${bookId}' found in inventory.`,
      });
      continue;
    }

    // Check stock availability (Task 3 — Error scenario)
    if (book.stock < quantity) {
      stockConflicts.push({
        field: `items[${i}].quantity`,
        rejectedValue: quantity,
        code: 'STOCK_DEFICIT',
        message: `Requested quantity (${quantity}) exceeds available stock (${book.stock}) for book '${bookId}'.`,
        context: {
          bookId,
          availableStock: book.stock,
          requestedQuantity: quantity,
        },
      });
      continue;
    }

    const lineTotal = parseFloat((book.price * quantity).toFixed(2));
    subtotal += lineTotal;
    enrichedItems.push({
      bookId: book.id,
      title: book.title,
      author: book.author,
      quantity,
      unitPrice: book.price,
      lineTotal,
    });
  }

  // Return 422 if any item-level validation failed
  if (invalidFields.length > 0) {
    return problemJson(
      res, 422, 'VALIDATION_FAILED', 'Unprocessable Content',
      'One or more order items failed validation.',
      req.path,
      { invalidFields },
    );
  }

  // Return 409 Conflict if any stock shortfall detected (Task 3 – Error scenario)
  if (stockConflicts.length > 0) {
    return problemJson(
      res, 409, 'INVENTORY_STOCK_EXCEEDED', 'Insufficient Inventory',
      'One or more requested items do not have sufficient stock to fulfill the order.',
      req.path,
      { invalidFields: stockConflicts },
    );
  }

  // ── 3. Build order ────────────────────────────────────────────────────────
  const shippingFee = 5.00;
  const taxRate = 0.08;
  const subtotalRounded = parseFloat(subtotal.toFixed(2));
  const taxAmount = parseFloat((subtotalRounded * taxRate).toFixed(2));
  const totalAmount = parseFloat((subtotalRounded + shippingFee + taxAmount).toFixed(2));

  const estimatedDelivery = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  const order = {
    id: `ord_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
    userId: req.user.id,
    orderStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    items: enrichedItems,
    pricing: {
      currency: 'USD',
      subtotal: subtotalRounded,
      shippingFee,
      taxAmount,
      totalAmount,
    },
    shippingAddress,
    estimatedDelivery,
    createdAt: new Date().toISOString(),
  };

  // ── 4. Deduct stock & persist order ──────────────────────────────────────
  enrichedItems.forEach(({ bookId, quantity }) => store.updateBookStock(bookId, -quantity));
  store.addOrder(order);

  // ── 5. Respond: Task 3 – Success (201 Created) ────────────────────────────
  res.status(201)
    .set('Location', `/v1/orders/${order.id}`)
    .json({ data: order });
});

// ── GET /v1/users/:userId/orders ──────────────────────────────────────────────
/**
 * @route   GET /v1/users/:userId/orders
 * @desc    Retrieve all orders for a specific user
 * @access  Private (authenticated — user can only access their own orders; admin can access any)
 */
router.get('/users/:userId/orders', authenticate, (req, res) => {
  const { userId } = req.params;

  // Authorization: customers may only view their own orders
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return problemJson(
      res, 403, 'FORBIDDEN', 'Forbidden',
      'You do not have permission to view orders for this user.',
      req.path,
    );
  }

  const user = store.getUserById(userId);
  if (!user) {
    return problemJson(
      res, 404, 'USER_NOT_FOUND', 'User Not Found',
      `No user with ID '${userId}' was found.`,
      req.path,
    );
  }

  const orders = store.getOrdersByUserId(userId);

  res.status(200).json({
    data: orders,
    meta: {
      userId,
      totalOrders: orders.length,
    },
  });
});

module.exports = router;
