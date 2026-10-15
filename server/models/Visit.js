const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visitDate: { type: Date, default: Date.now },
    visitNumber: { type: Number, default: 1 },
    isRepeatVisit: { type: Boolean, default: false },
    repeatReason: {
      type: String,
      default: '',
    },
    purpose: {
      type: String,
      enum: ['Tile Enquiry', 'Tile Purchase', 'Design Selection', 'Price Enquiry', 'Sample Selection', 'Product Consultation', 'Other'],
      required: true,
    },
    purchaseStatus: {
      type: String,
      enum: ['Purchased', 'Not Purchased', 'Interested'],
      default: 'Not Purchased',
    },
    nonPurchaseReason: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      default: 'Walk-in / Signboard',
    },
    notes: { type: String, default: '' },
    feedbackSubmitted: { type: Boolean, default: false },
    // Unique token for the customer feedback/complaint form link
    feedbackToken: { type: String, default: '' },
    feedbackTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visit', visitSchema);
