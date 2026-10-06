/**
 * In-memory data store — simulates a database for the Online Bookstore System.
 * Provides books inventory and orders collections with seed data.
 */

const { v4: uuidv4 } = require('uuid');

// ── Seed Data: Books ──────────────────────────────────────────────────────────
const books = [
  {
    id: 'bk_7f9c2d11',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    isbn: '978-1449373320',
    genre: 'Technology',
    publisher: "O'Reilly Media",
    publishedYear: 2017,
    price: 45.00,
    currency: 'USD',
    stock: 25,
    description: 'The big ideas behind reliable, scalable, and maintainable systems.',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9781449373320-M.jpg',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'bk_3a1b8e45',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    genre: 'Technology',
    publisher: 'Prentice Hall',
    publishedYear: 2008,
    price: 38.50,
    currency: 'USD',
    stock: 40,
    description: 'A Handbook of Agile Software Craftsmanship.',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg',
    createdAt: '2024-01-12T08:00:00Z',
    updatedAt: '2026-09-05T10:00:00Z',
  },
  {
    id: 'bk_c9d4e123',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt, David Thomas',
    isbn: '978-0135957059',
    genre: 'Technology',
    publisher: 'Addison-Wesley',
    publishedYear: 2019,
    price: 52.00,
    currency: 'USD',
    stock: 2,
    description: 'Your journey to mastery — 20th Anniversary Edition.',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9780135957059-M.jpg',
    createdAt: '2024-03-20T08:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'bk_d0e5f234',
    title: 'System Design Interview',
    author: 'Alex Xu',
    isbn: '979-8664653403',
    genre: 'Technology',
    publisher: 'Independently published',
    publishedYear: 2020,
    price: 29.99,
    currency: 'USD',
    stock: 0,
    description: 'An Insider\'s Guide — Volume 1.',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9798664653403-M.jpg',
    createdAt: '2024-06-15T08:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
];

// ── Seed Data: Users ──────────────────────────────────────────────────────────
const users = [
  {
    id: 'usr_8a9f7d10',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    role: 'customer',
    // In a real system, this would be a hashed password — here it's a demo token
    token: 'demo-token-jane',
  },
  {
    id: 'usr_1b2c3d4e',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'customer',
    token: 'demo-token-john',
  },
  {
    id: 'usr_admin01',
    name: 'Admin User',
    email: 'admin@bookstore.example.com',
    role: 'admin',
    token: 'demo-token-admin',
  },
];

// ── Seed Data: Orders ─────────────────────────────────────────────────────────
const orders = [
  {
    id: 'ord_abc123def',
    userId: 'usr_8a9f7d10',
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    items: [
      {
        bookId: 'bk_3a1b8e45',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        quantity: 1,
        unitPrice: 38.50,
        lineTotal: 38.50,
      },
    ],
    pricing: {
      currency: 'USD',
      subtotal: 38.50,
      shippingFee: 5.00,
      taxAmount: 3.08,
      totalAmount: 46.58,
    },
    shippingAddress: {
      recipientName: 'Jane Doe',
      streetLine1: '742 Evergreen Terrace',
      streetLine2: 'Apt 4B',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62704',
      country: 'USA',
    },
    estimatedDelivery: '2026-09-15T18:00:00Z',
    createdAt: '2026-09-10T12:00:00Z',
  },
];

// ── Store API ─────────────────────────────────────────────────────────────────

module.exports = {
  // Books
  getAllBooks: () => [...books],
  getBookById: (id) => books.find((b) => b.id === id) || null,
  addBook: (data) => {
    const book = {
      id: `bk_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    books.push(book);
    return book;
  },
  updateBookPrice: (id, price) => {
    const book = books.find((b) => b.id === id);
    if (!book) return null;
    book.price = price;
    book.updatedAt = new Date().toISOString();
    return book;
  },
  deleteBook: (id) => {
    const idx = books.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    books.splice(idx, 1);
    return true;
  },

  // Orders
  getAllOrders: () => [...orders],
  getOrdersByUserId: (userId) => orders.filter((o) => o.userId === userId),
  getOrderById: (id) => orders.find((o) => o.id === id) || null,
  addOrder: (order) => {
    orders.push(order);
    return order;
  },
  updateBookStock: (bookId, delta) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return false;
    book.stock = Math.max(0, book.stock + delta);
    book.updatedAt = new Date().toISOString();
    return true;
  },

  // Users
  getUserByToken: (token) => users.find((u) => u.token === token) || null,
  getUserById: (id) => users.find((u) => u.id === id) || null,
};
