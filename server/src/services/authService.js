const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 12;
const INVALID_CREDENTIALS_MSG = 'Invalid credentials';

/**
 * Register a new user.
 * @param {{ name: string, email: string, password: string, role?: string }} data
 * @returns {Promise<User>} The created user document (without passwordHash).
 */
async function register({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({ name, email, passwordHash, role });
  return user;
}

/**
 * Login an existing user.
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ token: string, user: User }>}
 */
async function login({ email, password }) {
  // Explicitly select passwordHash since it has select: false on the schema
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    const err = new Error(INVALID_CREDENTIALS_MSG);
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error(INVALID_CREDENTIALS_MSG);
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Strip passwordHash from the returned user object
  user.passwordHash = undefined;

  return { token, user };
}

module.exports = { register, login };
