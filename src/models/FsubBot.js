const mongoose = require('mongoose');

const fsubBotSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  startLink: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  addedBy: { type: Number },
}, { timestamps: true });

fsubBotSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model('FsubBot', fsubBotSchema);
