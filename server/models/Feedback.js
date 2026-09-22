const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratings: {
      behaviour: { type: Number, min: 1, max: 5, required: true },
      helpfulness: { type: Number, min: 1, max: 5, required: true },
      productKnowledge: { type: Number, min: 1, max: 5, required: true },
      tileCollection: { type: Number, min: 1, max: 5, required: true },
      pricingExplanation: { type: Number, min: 1, max: 5, required: true },
      overallExperience: { type: Number, min: 1, max: 5, required: true },
    },
    recommendationScore: { type: Number, min: 1, max: 10, required: true },
    comments: { type: String, default: '' },
    suggestions: { type: String, default: '' },
    hasComplaint: { type: Boolean, default: false },
    overallRating: { type: Number }, // calculated average
  },
  { timestamps: true }
);

// Auto-calculate overall rating before save
feedbackSchema.pre('save', function () {
  const r = this.ratings;
  const avg = (r.behaviour + r.helpfulness + r.productKnowledge + r.tileCollection + r.pricingExplanation + r.overallExperience) / 6;
  this.overallRating = parseFloat(avg.toFixed(2));
});

module.exports = mongoose.model('Feedback', feedbackSchema);
