const Event = require('../models/Event');
const Booking = require('../models/Booking');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new event.
 * availableSeats and organizer are never taken from the caller —
 * organizer comes from the authenticated user, availableSeats defaults
 * in the schema from totalSeats.
 *
 * @param {object} data         - Validated, .strict()-parsed body (no availableSeats/organizer).
 * @param {string} organizerId  - _id of the authenticated organizer.
 */
async function createEvent(data, organizerId) {
  // Destructure to explicitly drop any fields that must not come from clients,
  // providing a second layer of protection behind the .strict() Zod schema.
  const { availableSeats: _a, organizer: _o, ...safeFields } = data;
  const event = await Event.create({ ...safeFields, organizer: organizerId });
  return event;
}

/**
 * List events with optional full-text search, category/date filters,
 * pagination, and date-ascending sort.
 *
 * Defaults to upcoming events (date >= now) when dateFrom is not supplied.
 *
 * @param {object} options
 * @param {string}  [options.search]
 * @param {string}  [options.category]
 * @param {string}  [options.dateFrom]  - ISO datetime; defaults to now.
 * @param {string}  [options.dateTo]
 * @param {number}  [options.page=1]
 * @param {number}  [options.limit=10]
 */
async function getEvents({ search, category, dateFrom, dateTo, page = 1, limit = 10 } = {}) {
  const filter = {};

  // Trim once — whitespace-only must not produce a $text filter, because
  // MongoDB errors when textScore is projected without a $text query.
  const term = search?.trim();
  if (term) {
    filter.$text = { $search: term };
  }

  if (category) {
    filter.category = category;
  }

  // Default lower bound to now so past events are hidden unless explicitly
  // requested via dateFrom.
  filter.date = { $gte: dateFrom ? new Date(dateFrom) : new Date() };
  if (dateTo) {
    filter.date.$lte = new Date(dateTo);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const safePage  = Math.max(Number(page) || 1, 1);
  const skip      = (safePage - 1) * safeLimit;

  const projection = term ? { score: { $meta: 'textScore' } } : {};
  const sort       = term ? { score: { $meta: 'textScore' }, date: 1 } : { date: 1 };

  const [events, total] = await Promise.all([
    Event.find(filter, projection)
      .populate('organizer', 'name')   // email omitted — public endpoint
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .lean(),                         // plain JS objects — faster serialisation
    Event.countDocuments(filter),
  ]);

  return {
    events,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit),
  };
}

/**
 * Get a single event by ID.
 * @param {string} eventId
 */
async function getEventById(eventId) {
  const event = await Event.findById(eventId)
    .populate('organizer', 'name')  // email omitted — public endpoint
    .lean();
  if (!event) throw httpError(404, 'Event not found');
  return event;
}

/**
 * Get all events belonging to the requesting organizer.
 * Used by the organizer dashboard — includes past events and full detail.
 *
 * @param {string} organizerId
 * @param {{ page?: number, limit?: number }} options
 */
async function getMyEvents(organizerId, { page = 1, limit = 10 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const safePage  = Math.max(Number(page) || 1, 1);
  const skip      = (safePage - 1) * safeLimit;

  const filter = { organizer: organizerId };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ date: -1 })   // most recent first for the dashboard
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  return {
    events,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit),
  };
}

/**
 * Update an event with an atomic, optimistic-locking strategy to eliminate
 * the read-modify-write race condition on seat counts.
 *
 * @param {string} eventId
 * @param {object} updates      - Validated, .strict()-parsed body.
 * @param {string} organizerId
 */
async function updateEvent(eventId, updates, organizerId) {
  // Strip seat/ownership fields that must never come from the client —
  // second layer of protection behind the .strict() Zod schema.
  const { totalSeats, availableSeats: _a, organizer: _o, ...fields } = updates;

  const event = await Event.findById(eventId).select('organizer totalSeats availableSeats');
  if (!event) throw httpError(404, 'Event not found');
  if (!event.organizer.equals(organizerId)) {
    throw httpError(403, 'You are not authorised to modify this event');
  }

  const mongoUpdate = { $set: fields };
  const mongoFilter = { _id: eventId, organizer: organizerId };

  if (totalSeats !== undefined) {
    const seatsBooked = event.totalSeats - event.availableSeats;

    if (totalSeats < seatsBooked) {
      throw httpError(
        400,
        `Cannot reduce total seats to ${totalSeats}; ${seatsBooked} seat(s) are already booked`
      );
    }

    const delta = totalSeats - event.totalSeats;

    // Optimistic lock: abort if totals changed between our read and this write
    mongoFilter.totalSeats = event.totalSeats;
    if (delta < 0) {
      mongoFilter.availableSeats = { $gte: -delta };
    }

    // $inc preserves concurrent booking decrements
    mongoUpdate.$inc = { totalSeats: delta, availableSeats: delta };
  }

  const updated = await Event.findOneAndUpdate(mongoFilter, mongoUpdate, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw httpError(409, 'Event was modified or seats were booked concurrently; please retry');
  }

  return updated;
}

/**
 * Delete an event. Refuses if confirmed bookings exist so attendees don't
 * silently lose their records.
 *
 * @param {string} eventId
 * @param {string} organizerId
 */
async function deleteEvent(eventId, organizerId) {
  const event = await Event.findById(eventId).select('organizer');
  if (!event) throw httpError(404, 'Event not found');

  if (!event.organizer.equals(organizerId)) {
    throw httpError(403, 'You are not authorised to delete this event');
  }

  const hasBookings = await Booking.exists({ event: eventId, status: 'confirmed' });
  if (hasBookings) {
    throw httpError(409, 'Cannot delete an event with confirmed bookings');
  }

  await event.deleteOne();
}

module.exports = { createEvent, getEvents, getMyEvents, getEventById, updateEvent, deleteEvent };
