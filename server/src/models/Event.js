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
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      min: 0,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Default availableSeats to totalSeats on creation
eventSchema.pre('save', function (next) {
  if (this.isNew && this.availableSeats === undefined) {
    this.availableSeats = this.totalSeats;
  }
  next();
});

// Text index for search on title and description
eventSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Event', eventSchema);
