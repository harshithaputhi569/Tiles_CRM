const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, enum: ['admin', 'staff', 'all'], default: 'all' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['feedback', 'complaint', 'visit', 'general'], default: 'feedback' },
    referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback', default: null },
    metadata: {
      customerName: { type: String, default: '' },
      customerMobile: { type: String, default: '' },
      staffName: { type: String, default: '' },
      rating: { type: Number, default: 0 },
      ratings: { type: Object, default: {} },
      recommendationScore: { type: Number, default: 0 },
      comments: { type: String, default: '' },
      suggestions: { type: String, default: '' },
      hasComplaint: { type: Boolean, default: false },
      complaintCategory: { type: String, default: '' },
      complaintDescription: { type: String, default: '' },
      visitDate: { type: Date, default: null },
    },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
