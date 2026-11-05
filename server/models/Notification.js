const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, enum: ['admin', 'staff', 'all'], default: 'all' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['feedback', 'complaint', 'visit', 'general'], default: 'visit' },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: {
      customerName: { type: String, default: '' },
      customerMobile: { type: String, default: '' },
      customerType: { type: String, default: '' },
      address: { type: String, default: '' },
      staffName: { type: String, default: '' },
      staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null },
      visitPurpose: { type: String, default: '' },
      purchaseStatus: { type: String, default: '' },
      totalBillingValue: { type: Number, default: 0 },
      nonPurchaseReason: { type: String, default: '' },
      isRepeatVisit: { type: Boolean, default: false },
      visitNumber: { type: Number, default: 1 },
      repeatReason: { type: String, default: '' },
      stockRequested: { type: String, default: '' },
      stockAvailable: { type: String, default: '' },
      stockNotes: { type: String, default: '' },
      source: { type: String, default: '' },
      notes: { type: String, default: '' },
      feedbackToken: { type: String, default: '' },
      feedbackLink: { type: String, default: '' },
      rating: { type: Number, default: 0 },
      ratings: { type: Object, default: {} },
      recommendationScore: { type: Number, default: 0 },
      comments: { type: String, default: '' },
      suggestions: { type: String, default: '' },
      hasComplaint: { type: Boolean, default: false },
      complaintCategory: { type: String, default: '' },
      complaintDescription: { type: String, default: '' },
      visitDate: { type: Date, default: null },
      specialDayDate: { type: Date, default: null },
      specialDayReason: { type: String, default: '' },
    },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Prevent duplicate notifications within a given time window (default 24h)
notificationSchema.statics.createIfNotExists = async function (data, windowMs = 24 * 60 * 60 * 1000) {
  const query = {
    title: data.title,
    role: data.role || 'all',
  };
  if (data.recipient) query.recipient = data.recipient;
  else query.recipient = null;

  if (data.referenceId) query.referenceId = data.referenceId;

  if (windowMs) {
    const since = new Date(Date.now() - windowMs);
    query.createdAt = { $gte: since };
  }

  const existing = await this.findOne(query);
  if (existing) {
    return existing; // Already sent, do not duplicate!
  }
  return this.create(data);
};

module.exports = mongoose.model('Notification', notificationSchema);
