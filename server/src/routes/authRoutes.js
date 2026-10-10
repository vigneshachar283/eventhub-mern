const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerController, loginController, getMeController } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');
const protect = require('../middleware/protect');

const router = express.Router();

// 10 requests per 15 minutes per IP — limits brute-force and credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), registerController);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), loginController);

// GET /api/auth/me
router.get('/me', protect, getMeController);

module.exports = router;
