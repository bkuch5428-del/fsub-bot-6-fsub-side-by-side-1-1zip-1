require('dotenv').config();

const adminIds = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

module.exports = {
  botToken: process.env.BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
  adminIds,
  botUsername: process.env.BOT_USERNAME,
  logChannelId: process.env.LOG_CHANNEL_ID || null,
};
