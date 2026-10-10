const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
      max: 10, // per-booking cap — adjust as needed
      validate: {
        validator: Number.isInteger,
        message: 'seats must be a whole number',
      },
    },
    // Snapshot of price at booking time; guards against later organizer edits
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// User's booking history, newest first
bookingSchema.index({ user: 1, createdAt: -1 });

// Organizer's attendee list per event + status filter
bookingSchema.index({ event: 1, status: 1 });

// Prevent double-booking the same event; partial so a cancelled booking
// doesn't block a re-book. Duplicate key (11000) → 409 in the error handler.
bookingSchema.index(
  { user: 1, event: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

module.exports = mongoose.model('Booking', bookingSchema);
