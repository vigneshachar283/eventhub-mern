const Booking = require('../models/Booking');
const Event = require('../models/Event');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Atomically reserve seats and create a booking.
 *
 * The findOneAndUpdate is the anti-overbooking gate: it only succeeds when
 * the event exists, is in the future, and has enough available seats. If it
 * returns null we do a follow-up read to give the caller a specific reason.
 *
 * If Booking.create then fails (e.g. duplicate key → user already has a
 * confirmed booking for this event), the seats are returned atomically before
 * re-throwing so the event count stays accurate.
 *
 * @param {string} eventId
 * @param {string} userId
 * @param {number} seats
 */
async function bookSeats(eventId, userId, seats) {
  // 1. Atomically decrement availableSeats
  const event = await Event.findOneAndUpdate(
    {
      _id: eventId,
      availableSeats: { $gte: seats },
      date: { $gt: new Date() },
    },
    { $inc: { availableSeats: -seats } },
    { new: true }
  );

  if (!event) {
    // Distinguish the failure with a follow-up read (no seats decremented yet)
    const existing = await Event.findById(eventId).select('date availableSeats');
    if (!existing)                          throw httpError(404, 'Event not found');
    if (existing.date <= new Date())        throw httpError(400, 'Cannot book a past event');
    if (existing.availableSeats < seats)    throw httpError(409, 'Not enough seats available');
    // Fallback — shouldn't be reached, but keeps the function total
    throw httpError(409, 'Booking failed; please try again');
  }

  // 2. Create the booking; roll back the seat decrement on any failure
  try {
    const booking = await Booking.create({
      user: userId,
      event: eventId,
      seats,
      totalPrice: event.price * seats,
    });
    return booking;
  } catch (err) {
    // Return the seats before re-throwing — duplicate key (11000) surfaces as
    // 409 in the global error handler
    await Event.updateOne({ _id: eventId }, { $inc: { availableSeats: seats } });
    throw err;
  }
}

/**
 * Cancel a confirmed booking and return the seats to the event.
 *
 * findOneAndUpdate with { user, status: 'confirmed' } means:
 * - A booking that belongs to another user returns null → 404
 * - An already-cancelled booking returns null → 404
 * Both are intentional: callers shouldn't know which case applied.
 *
 * @param {string} bookingId
 * @param {string} userId
 */
async function cancelBooking(bookingId, userId) {
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, user: userId, status: 'confirmed' },
    { status: 'cancelled' },
    { new: true }
  );

  if (!booking) throw httpError(404, 'Active booking not found');

  // Return the seats atomically
  await Event.updateOne({ _id: booking.event }, { $inc: { availableSeats: booking.seats } });

  return booking;
}

/**
 * Get all bookings for a user, newest first, with event details populated.
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
