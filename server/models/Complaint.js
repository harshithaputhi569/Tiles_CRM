const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    feedback: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['Staff Behaviour', 'Waiting Time', 'Product Availability', 'Pricing', 'Billing', 'Product Information', 'Delivery', 'Other'],
      required: true,
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    adminRemarks: { type: String, default: '' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
