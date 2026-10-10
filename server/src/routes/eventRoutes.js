const express = require('express');
const {
  createEventController,
  getEventsController,
  getMyEventsController,
  getEventByIdController,
  updateEventController,
  deleteEventController,
} = require('../controllers/eventController');
const {
  validate,
  validateQuery,
  eventBodySchema,
  eventUpdateSchema,
  eventQuerySchema,
} = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────

// Query string validated so dateFrom=abc returns a clear 400
router.get('/', validateQuery(eventQuerySchema), getEventsController);

// /mine must be defined before /:id — otherwise Express matches "mine" as an
// ObjectId param and the route never fires
router.get('/mine', protect, restrictTo('organizer'), getMyEventsController);

router.get('/:id', getEventByIdController);

// ── Organizer-only ────────────────────────────────────────────────────────────

router.post(
  '/',
  protect,
  restrictTo('organizer'),
  validate(eventBodySchema),
  createEventController
);

// PATCH — correct verb for a partial update (schema is .partial())
router.patch(
  '/:id',
  protect,
  restrictTo('organizer'),
  validate(eventUpdateSchema),
  updateEventController
);

router.delete(
  '/:id',
  protect,
  restrictTo('organizer'),
  deleteEventController
);

module.exports = router;
