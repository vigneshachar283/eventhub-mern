const eventService = require('../services/eventService');

/**
 * POST /api/events
 * Body validated by eventBodySchema (.strict) — organizer inferred from req.user.
 */
async function createEventController(req, res, next) {
  try {
    const event = await eventService.createEvent(req.body, req.user._id);
    return res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/events
 * Query validated by eventQuerySchema before this controller is reached.
 * Parsed, coerced values are on req.validatedQuery.
 */
async function getEventsController(req, res, next) {
  try {
    const { search, category, dateFrom, dateTo, page, limit } = req.validatedQuery;
    const result = await eventService.getEvents({ search, category, dateFrom, dateTo, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/events/mine  (organizer dashboard)
 * Returns all events owned by the authenticated organizer, including past ones.
 * Defined as a named route (/mine) so it must be registered before /:id in
 * the router to prevent Express treating "mine" as an ObjectId param.
 * page/limit come from raw req.query — coerced to numbers in the service.
 */
async function getMyEventsController(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await eventService.getMyEvents(req.user._id, { page, limit });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/events/:id
 */
async function getEventByIdController(req, res, next) {
  try {
    const event = await eventService.getEventById(req.params.id);
    return res.status(200).json({ event });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/events/:id
 * Body validated by eventUpdateSchema (.strict, .partial) — ownership verified in service.
 */
async function updateEventController(req, res, next) {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body, req.user._id);
    return res.status(200).json({ event });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/events/:id
 * Ownership and confirmed-bookings guard verified in service.
 */
async function deleteEventController(req, res, next) {
  try {
    await eventService.deleteEvent(req.params.id, req.user._id);
    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/events/:id/bookings  (organizer-only)
 * Returns confirmed bookings for the event. Ownership verified in service.
 */
async function getEventBookingsController(req, res, next) {
  try {
    const bookings = await eventService.getEventBookings(req.params.id, req.user._id);
    return res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEventController,
  getEventsController,
  getMyEventsController,
  getEventByIdController,
  updateEventController,
  deleteEventController,
  getEventBookingsController,
};
