const express = require('express');
const { registerController, loginController, getMeController } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');
const protect = require('../middleware/protect');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), registerController);

// POST /api/auth/login
router.post('/login', validate(loginSchema), loginController);

// GET /api/auth/me
router.get('/me', protect, getMeController);

module.exports = router;
