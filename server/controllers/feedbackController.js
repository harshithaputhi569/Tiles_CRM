const Feedback = require('../models/Feedback');
const Visit = require('../models/Visit');
const Complaint = require('../models/Complaint');

// @route GET /api/feedback
const getFeedbacks = async (req, res) => {
  const { staff, rating, startDate, endDate, hasComplaint, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (staff) filter.staff = staff;
  if (rating) filter.overallRating = { $gte: Number(rating), $lt: Number(rating) + 1 };
  if (hasComplaint !== undefined) filter.hasComplaint = hasComplaint === 'true';
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // If staff role, only their own
  if (req.user.role === 'staff') filter.staff = req.user._id;

  const feedbacks = await Feedback.find(filter)
    .populate('customer', 'name mobile customerType')
    .populate('staff', 'name designation')
    .populate({ path: 'visit', select: 'purpose visitDate' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Feedback.countDocuments(filter);
  res.json({ feedbacks, total, pages: Math.ceil(total / limit) });
};

// @route POST /api/feedback  (authenticated staff)
const createFeedback = async (req, res) => {
  const { visitId, ratings, recommendationScore, comments, suggestions, hasComplaint, complaintCategory, complaintDescription } = req.body;

  const visit = await Visit.findById(visitId);
  if (!visit) return res.status(404).json({ message: 'Visit not found' });

  const feedback = await Feedback.create({
    visit: visitId,
    customer: visit.customer,
    staff: visit.staff,
    ratings,
    recommendationScore,
    comments,
    suggestions,
    hasComplaint,
  });

  visit.feedbackSubmitted = true;
  await visit.save();

  if (hasComplaint && complaintDescription) {
    await Complaint.create({
      feedback: feedback._id,
      customer: visit.customer,
      staff: visit.staff,
      category: complaintCategory || 'Other',
      description: complaintDescription,
    });
  }

  res.status(201).json(feedback);
};

// @route POST /api/feedback/public/:token  (PUBLIC — no auth, customer-facing)
// Customer submits feedback via their unique visit feedback link
const createPublicFeedback = async (req, res) => {
  try {
    const { token } = req.params;
    const { ratings, recommendationScore, comments, suggestions, hasComplaint, complaintCategory, complaintDescription } = req.body;

    const visit = await Visit.findOne({ feedbackToken: token })
      .populate('customer', 'name mobile')
      .populate('staff', 'name designation');

    if (!visit) return res.status(404).json({ message: 'Invalid or expired feedback link.' });
    if (visit.feedbackSubmitted) return res.status(409).json({ message: 'Feedback already submitted for this visit.' });
    if (visit.feedbackTokenExpiry && new Date() > visit.feedbackTokenExpiry) {
      return res.status(410).json({ message: 'This feedback link has expired.' });
    }

    // Validate ratings
    const requiredRatings = ['behaviour', 'helpfulness', 'productKnowledge', 'tileCollection', 'pricingExplanation', 'overallExperience'];
    for (const r of requiredRatings) {
      if (!ratings || !ratings[r] || ratings[r] < 1 || ratings[r] > 5) {
        return res.status(400).json({ message: `Invalid rating for: ${r}` });
      }
    }
    if (!recommendationScore || recommendationScore < 1 || recommendationScore > 10) {
      return res.status(400).json({ message: 'Recommendation score must be between 1 and 10.' });
    }

    const feedback = await Feedback.create({
      visit: visit._id,
      customer: visit.customer._id,
      staff: visit.staff._id,
      ratings,
      recommendationScore,
      comments: comments || '',
      suggestions: suggestions || '',
      hasComplaint: hasComplaint || false,
    });

    visit.feedbackSubmitted = true;
    await visit.save();

    if (hasComplaint && complaintDescription) {
      await Complaint.create({
        feedback: feedback._id,
        customer: visit.customer._id,
        staff: visit.staff._id,
        category: complaintCategory || 'Other',
        description: complaintDescription,
      });
    }

    res.status(201).json({ message: 'Thank you! Your feedback has been submitted.' });
  } catch (err) {
    console.error('Public feedback error:', err);
    res.status(500).json({ message: 'Failed to submit feedback. Please try again.' });
  }
};

module.exports = { getFeedbacks, createFeedback, createPublicFeedback };
