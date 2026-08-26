const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: String,
    message: String,
    type: { type: String, enum: ['INFO', 'SUCCESS', 'WARN', 'CRITICAL'], default: 'INFO' },
    link: String,
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
