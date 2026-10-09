const authService = require('../services/authService');

/**
 * POST /api/auth/register
 */
async function registerController(req, res, next) {
  try {
    const user = await authService.register(req.body);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function loginController(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me  (protected)
 * req.user is attached by the protect middleware — passwordHash already excluded.
 */
async function getMeController(req, res) {
  const { _id, name, email, role, createdAt, updatedAt } = req.user;

  return res.status(200).json({
    user: { _id, name, email, role, createdAt, updatedAt },
  });
}

module.exports = { registerController, loginController, getMeController };
