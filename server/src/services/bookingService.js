const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Reserve seats and create a booking inside a MongoDB transaction.
 *
 * Using a transaction eliminates the seat-leak window that exists in a
 * two-step read-modify-write: if the process dies after the seat decrement
 * but before the booking is written (or the rollback fails), the seats would
 * stay taken forever. With a transaction both operations commit or roll back
 * together. Requires a replica set or Atlas (transactions are not supported on
 * standalone mongod).
 *
 * Flow:
 *  0. Fast duplicate check — 409 before touching seats on a double-click.
 *  1. Atomically decrement availableSeats; null → distinguish the failure.
 *  2. Create the booking in the same transaction session.
 *  If either step throws, the transaction aborts and seats are never lost.
 *
 * @param {string} eventId
 * @param {string} userId
 * @param {number} seats
 */
async function bookSeats(eventId, userId, seats) {
  // 0. Fast duplicate check — avoids touching the seat count on a double-click.
  //    Not strictly required for correctness (the unique index + transaction
  //    handle it), but returns a clean 409 without any side-effects.
  const alreadyBooked = await Booking.exists({ user: userId, event: eventId, status: 'confirmed' });
  if (alreadyBooked) throw httpError(409, 'You already have a confirmed booking for this event');

  const session = await mongoose.startSession();
  try {
    let booking;

    await session.withTransaction(async () => {
      // 1. Atomically decrement — gate rejects past events and sold-out seats
      const event = await Event.findOneAndUpdate(
        {
          _id: eventId,
          availableSeats: { $gte: seats },
          date: { $gt: new Date() },
        },
        { $inc: { availableSeats: -seats } },
        { new: true, session }
      );

      if (!event) {
        // Follow-up read outside the transaction to give a specific reason.
        // The transaction hasn't written anything yet so this is safe.
        const existing = await Event.findById(eventId).select('date availableSeats');
        if (!existing)                       throw httpError(404, 'Event not found');
        if (existing.date <= new Date())     throw httpError(400, 'Cannot book a past event');
        if (existing.availableSeats < seats) throw httpError(409, 'Not enough seats available');
        throw httpError(409, 'Booking failed; please try again');
      }

      // 2. Create the booking inside the same session
      [booking] = await Booking.create(
        [{ user: userId, event: eventId, seats, totalPrice: event.price * seats }],
        { session }
      );
    });

    return booking;
  } finally {
    session.endSession();
  }
}

/**
 * Cancel a confirmed booking and return the seats to the event, inside a
 * transaction. Prevents a seat leak if the process dies between the status
 * update and the availableSeats increment.
 *
 * findOneAndUpdate filters on { user, status: 'confirmed' }:
 *  - Wrong user   → null → 404
 *  - Already cancelled → null → 404
 * Both map to the same 404 intentionally (no information leak).
 *
 * @param {string} bookingId
 * @param {string} userId
 */
async function cancelBooking(bookingId, userId) {
  const session = await mongoose.startSession();
  try {
    let booking;

    await session.withTransaction(async () => {
      booking = await Booking.findOneAndUpdate(
        { _id: bookingId, user: userId, status: 'confirmed' },
        { status: 'cancelled' },
        { new: true, session }
      );

      if (!booking) throw httpError(404, 'Active booking not found');

      await Event.updateOne(
        { _id: booking.event },
        { $inc: { availableSeats: booking.seats } },
        { session }
      );
    });

    return booking;
  } finally {
    session.endSession();
  }
}

/**
 * Get all bookings for a user, newest first, with event details populated.
 * Note: event will be null if the event was deleted. Handle this in the UI.
 *
 * @param {string} userId
 */
async function getMyBookings(userId) {
  const bookings = await Booking.find({ user: userId })
    .populate('event', 'title date venue price')
    .sort({ createdAt: -1 })
    .lean();

  return bookings;
}

module.exports = { bookSeats, cancelBooking, getMyBookings };
