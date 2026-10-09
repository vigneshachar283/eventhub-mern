const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require('dotenv').config();

// Fail fast — a missing JWT_SECRET would produce silent 401s that are very
// hard to debug at runtime.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
