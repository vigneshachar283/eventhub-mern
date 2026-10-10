const bookingService = require('../services/bookingService');

/**
 * POST /api/events/:id/book
 * Attendee-only. Body: { seats }
 * eventId comes from the parent router param (:id on the events router).
 */
async function bookSeatsController(req, res, next) {
  try {
    const booking = await bookingService.bookSeats(
      req.params.id,   // eventId
      req.user._id,    // userId from protect middleware
      req.body.seats
    );
    return res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/mine
 * Returns the authenticated user's bookings, newest first.
 */
async function getMyBookingsController(req, res, next) {
  try {
    const bookings = await bookingService.getMyBookings(req.user._id);
    return res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 * Cancels a confirmed booking that belongs to the authenticated user.
 */
async function cancelBookingController(req, res, next) {
  try {
    const booking = await bookingService.cancelBooking(
      req.params.id,  // bookingId
      req.user._id
    );
    return res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
}

module.exports = { bookSeatsController, getMyBookingsController, cancelBookingController };
