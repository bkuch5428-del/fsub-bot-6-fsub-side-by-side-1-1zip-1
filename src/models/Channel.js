const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  channelId: { type: String, required: true }, // e.g. -1001234567890
  type: { type: String, enum: ['fsub', 'target'], required: true },

  title: { type: String, required: true },
  description: { type: String, default: '' },

  // Only meaningful for type === 'target'
  postMode: { type: String, enum: ['link', 'forward', 'copy'], default: 'link' },
  autoDelete: { type: Number, default: 0 }, // seconds, 0 = off
  posterFileId: { type: String, default: null },

  // Only meaningful for type === 'fsub'
  inviteLink: { type: String, default: null },

  shareId: { type: String, unique: true, sparse: true },
  addedBy: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
