const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visitDate: { type: Date, default: Date.now },
    purpose: {
      type: String,
      enum: ['Tile Enquiry', 'Tile Purchase', 'Design Selection', 'Price Enquiry', 'Sample Selection', 'Product Consultation', 'Other'],
      required: true,
    },
    notes: { type: String, default: '' },
    feedbackSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visit', visitSchema);
