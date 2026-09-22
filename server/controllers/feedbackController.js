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

// @route POST /api/feedback
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

module.exports = { getFeedbacks, createFeedback };
