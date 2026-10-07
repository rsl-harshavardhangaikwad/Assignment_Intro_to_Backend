/**
 * Books Router — /v1/books
 *
 * Implements Task 2 endpoints for the bookstore inventory:
 *
 *  GET    /v1/books         – Fetch list of all books
 *  GET    /v1/books/:id     – Fetch details of a specific book
 *  POST   /v1/books         – Add a new book (admin only)
 *  PATCH  /v1/books/:id     – Update price of an existing book (admin only)
 *  DELETE /v1/books/:id     – Delete a book record (admin only)
 */

const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { authenticate, requireRole } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a structured RFC 7807 problem JSON error response.
 */
const problemJson = (res, status, errorCode, title, detail, path, extra = {}) =>
  res.status(status).json({
    type: `https://api.bookstore.example.com/errors/${errorCode.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    errorCode,
    detail,
    instance: path,
    timestamp: new Date().toISOString(),
    ...extra,
  });

// ── GET /v1/books ─────────────────────────────────────────────────────────────
/**
 * @route   GET /v1/books
 * @desc    Retrieve a paginated, filterable list of all books
 * @access  Public
 * @query   genre, author, minPrice, maxPrice, page, limit
 */
router.get('/', (req, res) => {
  let books = store.getAllBooks();

  // Optional filters
  const { genre, author, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

  if (genre) books = books.filter((b) => b.genre.toLowerCase() === genre.toLowerCase());
  if (author) books = books.filter((b) => b.author.toLowerCase().includes(author.toLowerCase()));
  if (minPrice) books = books.filter((b) => b.price >= parseFloat(minPrice));
  if (maxPrice) books = books.filter((b) => b.price <= parseFloat(maxPrice));

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const total = books.length;
  const start = (pageNum - 1) * limitNum;
  const paginatedBooks = books.slice(start, start + limitNum);

  res.status(200).json({
    data: paginatedBooks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// ── GET /v1/books/:id ─────────────────────────────────────────────────────────
/**
 * @route   GET /v1/books/:id
 * @desc    Retrieve a single book by its ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  const book = store.getBookById(req.params.id);

  if (!book) {
    return problemJson(
      res, 404, 'BOOK_NOT_FOUND', 'Book Not Found',
      `No book with ID '${req.params.id}' was found in the inventory.`,
      req.path,
    );
  }

  res.status(200).json({ data: book });
});

// ── POST /v1/books ────────────────────────────────────────────────────────────
/**
 * @route   POST /v1/books
 * @desc    Add a new book to the inventory (admin only)
 * @access  Private (admin)
 */
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { title, author, isbn, genre, publisher, publishedYear, price, stock, description, coverImageUrl } = req.body;

  // Validate required fields
  const invalidFields = [];

  if (!title || typeof title !== 'string' || title.trim() === '') {
    invalidFields.push({ field: 'title', message: 'title is required and must be a non-empty string.' });
  }
  if (!author || typeof author !== 'string' || author.trim() === '') {
    invalidFields.push({ field: 'author', message: 'author is required and must be a non-empty string.' });
  }
  if (!isbn || typeof isbn !== 'string') {
    invalidFields.push({ field: 'isbn', message: 'isbn is required and must be a string.' });
  }
  if (typeof price !== 'number' || price <= 0) {
    invalidFields.push({ field: 'price', rejectedValue: price, message: 'price must be a positive number.' });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    invalidFields.push({ field: 'stock', rejectedValue: stock, message: 'stock must be a non-negative integer.' });
  }

  if (invalidFields.length > 0) {
    return problemJson(
      res, 422, 'VALIDATION_FAILED', 'Unprocessable Content',
      'One or more fields failed validation.',
      req.path,
      { invalidFields },
    );
  }

  const newBook = store.addBook({
    title: title.trim(),
    author: author.trim(),
    isbn,
    genre: genre || 'General',
    publisher: publisher || '',
    publishedYear: publishedYear || null,
    price,
    currency: 'USD',
    stock,
    description: description || '',
    coverImageUrl: coverImageUrl || '',
  });

  res.status(201)
    .set('Location', `/v1/books/${newBook.id}`)
    .json({ data: newBook });
});

// ── PATCH /v1/books/:id ───────────────────────────────────────────────────────
/**
 * @route   PATCH /v1/books/:id
 * @desc    Partially update a book — specifically its price (admin only)
 * @access  Private (admin)
 */
router.patch('/:id', authenticate, requireRole('admin'), (req, res) => {
  const { price } = req.body;

  if (typeof price !== 'number' || price <= 0) {
    return problemJson(
      res, 422, 'VALIDATION_FAILED', 'Unprocessable Content',
      'price must be a positive number.',
      req.path,
      { invalidFields: [{ field: 'price', rejectedValue: price, message: 'price must be a positive number.' }] },
    );
  }

  const updated = store.updateBookPrice(req.params.id, price);

  if (!updated) {
    return problemJson(
      res, 404, 'BOOK_NOT_FOUND', 'Book Not Found',
      `No book with ID '${req.params.id}' was found.`,
      req.path,
    );
  }

  res.status(200).json({ data: updated });
});

// ── DELETE /v1/books/:id ──────────────────────────────────────────────────────
/**
 * @route   DELETE /v1/books/:id
 * @desc    Remove a book record from the inventory (admin only)
 * @access  Private (admin)
 */
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const deleted = store.deleteBook(req.params.id);

  if (!deleted) {
    return problemJson(
      res, 404, 'BOOK_NOT_FOUND', 'Book Not Found',
      `No book with ID '${req.params.id}' was found in the inventory.`,
      req.path,
    );
  }

  res.status(204).send();
});

module.exports = router;
