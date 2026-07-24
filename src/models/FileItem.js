const mongoose = require('mongoose');

const fileItemSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true }, // used in deep link /start=token
  fileId: { type: String, required: true },
  fileUniqueId: { type: String },
  fileType: { type: String, enum: ['photo', 'video', 'document', 'audio'], required: true }, // matches Telegram's message content types
  fileName: { type: String, default: '' },

  episodeNumber: { type: Number, default: null },
  episodeLabel: { type: String, default: null }, // e.g. "EPISODE 1"

  caption: { type: String, default: '' },
  buttons: [{ text: String, url: String }],

  // If this file was part of a batch post (multiple episodes in one message)
  batchId: { type: String, default: null },

  uploadedBy: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FileItem', fileItemSchema);
