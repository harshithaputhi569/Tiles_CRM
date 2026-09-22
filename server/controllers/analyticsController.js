const Feedback = require('../models/Feedback');
const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

// @route GET /api/analytics/dashboard  [admin]
const getDashboardMetrics = async (req, res) => {
  const [totalCustomers, totalVisits, totalFeedback, totalComplaints, pendingComplaints, resolvedComplaints, activeStaff] =
    await Promise.all([
      Customer.countDocuments(),
      Visit.countDocuments(),
      Feedback.countDocuments(),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      User.countDocuments({ role: 'staff', isActive: true }),
    ]);

  const allFeedback = await Feedback.find().select('overallRating');
  const avgRating =
    allFeedback.length > 0
      ? parseFloat((allFeedback.reduce((s, f) => s + f.overallRating, 0) / allFeedback.length).toFixed(2))
      : 0;
  const satisfactionRate =
    allFeedback.length > 0
      ? parseFloat(((allFeedback.filter((f) => f.overallRating >= 4).length / allFeedback.length) * 100).toFixed(1))
      : 0;

  res.json({
    totalCustomers,
    totalVisits,
    totalFeedback,
    avgRating,
    satisfactionRate,
    totalComplaints,
    pendingComplaints,
    resolvedComplaints,
    activeStaff,
  });
};

// Helper to build date filter
const buildDateFilter = (startDate, endDate, days) => {
  if (startDate || endDate) {
    const filter = {};
    if (startDate) filter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.$lte = end;
    }
    return { createdAt: filter };
  } else if (days) {
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    return { createdAt: { $gte: since } };
  }
  return {};
};

// @route GET /api/analytics/feedback-trend  [admin]
const getFeedbackTrend = async (req, res) => {
  const { startDate, endDate, days } = req.query;
  const matchFilter = buildDateFilter(startDate, endDate, days || (!startDate && !endDate ? 30 : null));

  const pipeline = [];
  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }
  pipeline.push(
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        avgRating: { $avg: '$overallRating' },
      },
    },
    { $sort: { _id: 1 } }
  );

  const trend = await Feedback.aggregate(pipeline);
  res.json(trend);
};

// @route GET /api/analytics/rating-distribution  [admin]
const getRatingDistribution = async (req, res) => {
  const { startDate, endDate, days } = req.query;
  const matchFilter = buildDateFilter(startDate, endDate, days);

  const pipeline = [];
  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }
  pipeline.push(
    {
      $group: {
        _id: { $round: ['$overallRating', 0] },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } }
  );

  const dist = await Feedback.aggregate(pipeline);
  res.json(dist);
};

// @route GET /api/analytics/staff-performance  [admin]
const getStaffPerformanceAll = async (req, res) => {
  const { startDate, endDate, days } = req.query;
  const matchFilter = buildDateFilter(startDate, endDate, days);

  const pipeline = [];
  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }
  pipeline.push(
    {
      $group: {
        _id: '$staff',
        feedbackCount: { $sum: 1 },
        avgRating: { $avg: '$overallRating' },
        avgBehaviour: { $avg: '$ratings.behaviour' },
        avgHelpfulness: { $avg: '$ratings.helpfulness' },
        avgProductKnowledge: { $avg: '$ratings.productKnowledge' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'staffInfo',
      },
    },
    { $unwind: '$staffInfo' },
    {
      $project: {
        name: '$staffInfo.name',
        designation: '$staffInfo.designation',
        feedbackCount: 1,
        avgRating: { $round: ['$avgRating', 2] },
        avgBehaviour: { $round: ['$avgBehaviour', 2] },
        avgHelpfulness: { $round: ['$avgHelpfulness', 2] },
        avgProductKnowledge: { $round: ['$avgProductKnowledge', 2] },
      },
    },
    { $sort: { avgRating: -1 } }
  );

  const result = await Feedback.aggregate(pipeline);
  res.json(result);
};

// @route GET /api/analytics/complaint-categories  [admin]
const getComplaintCategories = async (req, res) => {
  const { startDate, endDate, days } = req.query;
  const matchFilter = buildDateFilter(startDate, endDate, days);

  const pipeline = [];
  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }
  pipeline.push(
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  );

  const data = await Complaint.aggregate(pipeline);
  res.json(data);
};

module.exports = {
  getDashboardMetrics,
  getFeedbackTrend,
  getRatingDistribution,
  getStaffPerformanceAll,
  getComplaintCategories,
};
