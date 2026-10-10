const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require('dotenv').config();

// Fail fast — missing secrets produce confusing errors deep in the stack
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('FATAL: MONGO_URI environment variable is not set. Exiting.');
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
