const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  // Allow the Vite dev server and the deployed frontend.
  // Set CLIENT_ORIGIN in .env for production.
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));



app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // MongoDB duplicate key — e.g. unique booking or duplicate email
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate entry: resource already exists' });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Cast error — e.g. invalid ObjectId in a route param
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for field '${err.path}'` });
  }

  // Default: read statusCode set by services, fall back to 500
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
});

module.exports = app;
