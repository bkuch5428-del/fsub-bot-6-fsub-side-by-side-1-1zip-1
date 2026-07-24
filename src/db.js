const dns = require('dns');
const mongoose = require('mongoose');
const { mongoUri } = require('./config');

// Some ISPs/networks (common on Indian broadband/mobile networks) block or
// fail to resolve the DNS SRV records that "mongodb+srv://" URIs depend on.
// Forcing Node to use a public DNS resolver fixes this without needing to
// change your OS network settings.
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectDB() {
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in .env');
  }
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
