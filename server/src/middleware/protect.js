// Re-exports protect from the canonical auth middleware module.
// Kept for backwards compatibility with any existing imports.
const { protect } = require('./auth');

module.exports = protect;
