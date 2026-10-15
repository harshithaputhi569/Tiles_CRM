const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true },
    email: { type: String, lowercase: true, default: '' },
    customerType: {
      type: String,
      enum: ['New Customer', 'Existing Customer', 'Contractor', 'Builder', 'Architect', 'Interior Designer', 'Other'],
      default: 'New Customer',
    },
    source: {
      type: String,
      enum: [
        'Social Media',
        'Friends & Family',
        'Google / Online Search',
        'Architect / Interior Designer',
        'Builder / Contractor Referral',
        'Walk-in / Signboard',
        'Other',
      ],
      default: 'Walk-in / Signboard',
    },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
