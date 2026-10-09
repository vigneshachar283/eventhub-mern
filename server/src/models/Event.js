const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      min: 0,
      // Defaults to totalSeats at creation; works for both save() and insertMany()
      default: function () {
        return this.totalSeats;
      },
      validate: {
        validator: function (v) {
          return v <= this.totalSeats;
        },
        message: 'availableSeats cannot exceed totalSeats',
      },
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Full-text search on title and description
eventSchema.index({ title: 'text', description: 'text' });

// Date-range queries and sorting
eventSchema.index({ date: 1 });

// Category filter + date sort (covers category-only queries too)
eventSchema.index({ category: 1, date: 1 });

// Organizer's own events listing
eventSchema.index({ organizer: 1 });

module.exports = mongoose.model('Event', eventSchema);
