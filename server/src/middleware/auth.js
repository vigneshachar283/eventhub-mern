const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT in the Authorization header, loads the user from the
 * database, and attaches them to req.user.
 *
 * Responds 401 if the token is missing, malformed, expired, or the user no
 * longer exists.
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // passwordHash has select: false — it will never be included here
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorised, user not found' });
    }

    next();
  } catch {
    return res.status(401).json({ message: 'Not authorised, token invalid' });
  }
}

/**
 * Restricts a route to users whose role is in the allowed list.
 * Must be used after protect so that req.user is already set.
 *
 * @param {...string} roles  Allowed role values, e.g. restrictTo('organizer')
 */
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not permitted to perform this action`,
      });
    }
    next();
  };
}

module.exports = { protect, restrictTo };
