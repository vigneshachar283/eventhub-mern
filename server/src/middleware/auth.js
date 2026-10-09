const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT in the Authorization header, loads the user from the
 * database, and attaches them to req.user.
 *
 * All failures call next(err) so the global error handler shapes the response
 * consistently.
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Not authorised, no token');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  try {
    // Algorithm pinned to prevent alg-switching attacks
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    // passwordHash has select: false — never included here
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      const err = new Error('Not authorised, user not found');
      err.statusCode = 401;
      return next(err);
    }

    next();
  } catch {
    const err = new Error('Not authorised, token invalid');
    err.statusCode = 401;
    return next(err);
  }
}

/**
 * Restricts a route to users whose role is in the allowed list.
 * Must be used after protect so that req.user is already set.
 *
 * NOTE: this only checks role, not ownership. For mutating routes (update,
 * delete) also verify event.organizer.equals(req.user._id) in the controller
 * and return 403 if it doesn't match.
 *
 * @param {...string} roles  e.g. restrictTo('organizer')
 */
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const err = new Error(
        `Role '${req.user.role}' is not permitted to perform this action`
      );
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
}

module.exports = { protect, restrictTo };
