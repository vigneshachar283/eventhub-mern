const express = require('express');
const { getMyBookingsController, cancelBookingController } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/bookings/mine — must be before /:id/cancel to avoid param clash
router.get('/mine', protect, getMyBookingsController);

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', protect, cancelBookingController);

module.exports = router;
