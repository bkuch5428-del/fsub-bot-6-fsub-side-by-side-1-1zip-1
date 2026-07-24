const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  username: { type: String, default: null },
  firstName: { type: String, default: null },
  referredBy: { type: Number, default: null },
  referralCount: { type: Number, default: 0 },
  // Bot FSub cannot be verified by Telegram across independent bots.
  // These IDs record that the user acknowledged the external bot requirement.
  acknowledgedFsubBots: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
