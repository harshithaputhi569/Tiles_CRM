const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

// @route GET /api/analytics/dashboard  [admin]
const getDashboardMetrics = async (req, res) => {
  const [
    visitedCustomerIds,
    totalVisits,
    totalFeedback,
    totalComplaints,
    pendingComplaints,
    resolvedComplaints,
    activeStaff,
    purchasedVisits,
    notPurchasedVisits,
  ] = await Promise.all([
    Visit.distinct('customer'), // unique customers who physically visited
    Visit.countDocuments(),
    Feedback.countDocuments(),
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: 'Pending' }),
    Complaint.countDocuments({ status: 'Resolved' }),
    User.countDocuments({ role: 'staff', isActive: true }),
    Visit.countDocuments({ purchaseStatus: 'Purchased' }),
    Visit.countDocuments({ purchaseStatus: 'Not Purchased' }),
  ]);

  // Count repeat customers (visited 2+ times)
  const repeatCustAgg = await Visit.aggregate([
    { $group: { _id: '$customer', count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
  ]);
  const repeatCustomersCount = repeatCustAgg.length;

  const totalCustomers = visitedCustomerIds.length;

  const allFeedback = await Feedback.find().select('overallRating');
  const avgRating =
    allFeedback.length > 0
      ? parseFloat((allFeedback.reduce((s, f) => s + f.overallRating, 0) / allFeedback.length).toFixed(2))
      : 0;
  const satisfactionRate =
    allFeedback.length > 0
      ? parseFloat(((allFeedback.filter((f) => f.overallRating >= 4).length / allFeedback.length) * 100).toFixed(1))
      : 0;

  const conversionRate = totalVisits > 0 ? parseFloat(((purchasedVisits / totalVisits) * 100).toFixed(1)) : 0;

  res.json({
    totalCustomers,
    totalVisits,
    purchasedVisits,
    notPurchasedVisits,
    conversionRate,
    repeatCustomersCount,
    totalFeedback,
    avgRating,
    satisfactionRate,
    totalComplaints,
    pendingComplaints,
    resolvedComplaints,
    activeStaff,
  });
};

// Helper to build date filter for createdAt
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

// Helper to build date filter for visits (checks visitDate and fallback createdAt)
const buildVisitDateFilter = (startDate, endDate, days) => {
  if (startDate || endDate) {
    const dateRange = {};
    if (startDate) dateRange.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    return {
      $or: [
        { visitDate: dateRange },
        { visitDate: { $exists: false }, createdAt: dateRange },
      ],
    };
  } else if (days) {
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    return {
      $or: [
        { visitDate: { $gte: since } },
        { visitDate: { $exists: false }, createdAt: { $gte: since } },
      ],
    };
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

// @route GET /api/analytics/purchase-conversion  [admin & staff]
const getPurchaseAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, days, staff } = req.query;
    const matchFilter = buildVisitDateFilter(startDate, endDate, days);

    // If user is staff, scope to their own visits only
    if (req.user.role === 'staff') {
      matchFilter.staff = req.user._id;
    } else if (staff && staff !== 'all') {
      matchFilter.staff = new mongoose.Types.ObjectId(staff);
    }

    const [totalVisits, purchasedCount, notPurchasedCount, billingAgg] = await Promise.all([
      Visit.countDocuments(matchFilter),
      Visit.countDocuments({ ...matchFilter, purchaseStatus: 'Purchased' }),
      Visit.countDocuments({ ...matchFilter, purchaseStatus: 'Not Purchased' }),
      Visit.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, totalBilling: { $sum: '$totalBillingValue' } } },
      ]),
    ]);

    const totalBillingValue = billingAgg.length > 0 ? (billingAgg[0].totalBilling || 0) : 0;
    const conversionRate = totalVisits > 0 ? parseFloat(((purchasedCount / totalVisits) * 100).toFixed(1)) : 0;


    // Reason counts for Not Purchased
    const reasonsAgg = await Visit.aggregate([
      {
        $match: {
          ...matchFilter,
          purchaseStatus: 'Not Purchased',
          nonPurchaseReason: { $exists: true, $nin: ['', null] },
        },
      },
      { $group: { _id: '$nonPurchaseReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const reasonsBreakdown = reasonsAgg.map((r) => ({
      reason: r._id,
      count: r.count,
      percentage: notPurchasedCount > 0 ? parseFloat(((r.count / notPurchasedCount) * 100).toFixed(1)) : 0,
    }));

    // Customer Referral Sources breakdown (total, purchased, not purchased)
    const sourcesAgg = await Visit.aggregate([
      {
        $match: {
          ...matchFilter,
          source: { $exists: true, $nin: ['', null] },
        },
      },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          purchased: {
            $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Purchased'] }, 1, 0] },
          },
          notPurchased: {
            $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Not Purchased'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const sourcesBreakdown = sourcesAgg.map((s) => ({
      source: s._id,
      count: s.total,
      purchased: s.purchased,
      notPurchased: s.notPurchased,
      conversionRate: s.total > 0 ? parseFloat(((s.purchased / s.total) * 100).toFixed(1)) : 0,
      percentage: totalVisits > 0 ? parseFloat(((s.total / totalVisits) * 100).toFixed(1)) : 0,
    }));

    // Daily trend
    const trendAgg = await Visit.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$visitDate', '$createdAt'] },
            },
          },
          total: { $sum: 1 },
          purchased: {
            $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Purchased'] }, 1, 0] },
          },
          notPurchased: {
            $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Not Purchased'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Staff comparison (for admin)
    let staffBreakdown = [];
    if (req.user.role === 'admin') {
      const staffAgg = await Visit.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$staff',
            totalVisits: { $sum: 1 },
            purchased: {
              $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Purchased'] }, 1, 0] },
            },
            notPurchased: {
              $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Not Purchased'] }, 1, 0] },
            },
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
            staffName: '$staffInfo.name',
            designation: '$staffInfo.designation',
            totalVisits: 1,
            purchased: 1,
            notPurchased: 1,
            conversionRate: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$purchased', { $cond: [{ $eq: ['$totalVisits', 0] }, 1, '$totalVisits'] }] },
                    100,
                  ],
                },
                1,
              ],
            },
          },
        },
        { $sort: { totalVisits: -1 } },
      ]);
      staffBreakdown = staffAgg;
    }

    // Recent visits matching filter
    const recentVisits = await Visit.find(matchFilter)
      .populate('customer', 'name mobile customerType source')
      .populate('staff', 'name designation')
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(30);

    res.json({
      totalVisits,
      purchasedCount,
      notPurchasedCount,
      conversionRate,
      totalBillingValue,
      reasonsBreakdown,
      sourcesBreakdown,
      dailyTrend: trendAgg.map((t) => ({
        date: t._id,
        total: t.total,
        purchased: t.purchased,
        notPurchased: t.notPurchased,
      })),
      staffBreakdown,
      recentVisits,
    });
  } catch (err) {
    console.error('getPurchaseAnalytics error:', err);
    res.status(500).json({ message: 'Failed to calculate purchase analytics' });
  }
};

// @route GET /api/analytics/repeat-visitors [admin & staff]
// Answers: How many customers visited 2 or 3 times, WHY they returned, and what happened on each visit!
const getRepeatVisitorsAnalytics = async (req, res) => {
  try {
    const repeatCustGroups = await Visit.aggregate([
      {
        $group: {
          _id: '$customer',
          totalVisits: { $sum: 1 },
          firstVisit: { $min: '$visitDate' },
          latestVisit: { $max: '$visitDate' },
          hasPurchased: {
            $max: { $cond: [{ $eq: ['$purchaseStatus', 'Purchased'] }, 1, 0] },
          },
        },
      },
      { $match: { totalVisits: { $gte: 2 } } },
      { $sort: { totalVisits: -1, latestVisit: -1 } },
    ]);

    const repeatCustomerIds = repeatCustGroups.map((g) => g._id);

    const customers = await Customer.find({ _id: { $in: repeatCustomerIds } });
    const customerMap = {};
    customers.forEach((c) => {
      customerMap[c._id.toString()] = c;
    });

    const allRepeatVisits = await Visit.find({ customer: { $in: repeatCustomerIds } })
      .populate('staff', 'name designation')
      .sort({ visitDate: 1, createdAt: 1 });

    const visitsByCustomer = {};
    allRepeatVisits.forEach((v) => {
      const cId = v.customer.toString();
      if (!visitsByCustomer[cId]) visitsByCustomer[cId] = [];
      visitsByCustomer[cId].push(v);
    });

    const repeatVisitors = repeatCustGroups.map((g) => {
      const cId = g._id.toString();
      const cust = customerMap[cId];
      const visits = visitsByCustomer[cId] || [];

      // Find repeat reason from 2nd or 3rd visit
      const repeatVisits = visits.filter((v, idx) => idx > 0);
      const latestRepeatReason =
        repeatVisits.map((v) => v.repeatReason).filter(Boolean).pop() ||
        'Follow-up on Previous Enquiry';

      const earlierNonPurchaseReasons = visits
        .slice(0, -1)
        .filter((v) => v.purchaseStatus === 'Not Purchased')
        .map((v) => v.nonPurchaseReason)
        .filter(Boolean);

      const latestVisit = visits[visits.length - 1];
      const initialVisit = visits[0];

      return {
        customerId: cId,
        customerName: cust?.name || 'Customer',
        mobile: cust?.mobile || '',
        customerType: cust?.customerType || '',
        source: cust?.source || initialVisit?.source || 'Walk-in / Signboard',
        totalVisits: g.totalVisits,
        firstVisitDate: g.firstVisit,
        latestVisitDate: g.latestVisit,
        converted: g.hasPurchased === 1,
        latestStatus: latestVisit?.purchaseStatus || 'Not Purchased',
        latestRepeatReason,
        earlierNonPurchaseReasons,
        visits: visits.map((v, idx) => ({
          visitId: v._id,
          visitNumber: v.visitNumber || idx + 1,
          date: v.visitDate || v.createdAt,
          purpose: v.purpose,
          purchaseStatus: v.purchaseStatus,
          nonPurchaseReason: v.nonPurchaseReason || '',
          repeatReason: v.repeatReason || (idx > 0 ? 'Follow-up on Previous Enquiry' : ''),
          staffName: v.staff?.name || 'Staff',
          notes: v.notes || '',
        })),
      };
    });

    const twoVisitsCount = repeatCustGroups.filter((g) => g.totalVisits === 2).length;
    const threeVisitsCount = repeatCustGroups.filter((g) => g.totalVisits === 3).length;
    const moreThanThreeCount = repeatCustGroups.filter((g) => g.totalVisits > 3).length;
    const convertedCount = repeatCustGroups.filter((g) => g.hasPurchased === 1).length;
    const repeatConversionRate =
      repeatCustGroups.length > 0
        ? parseFloat(((convertedCount / repeatCustGroups.length) * 100).toFixed(1))
        : 0;

    // Reason frequency aggregation for repeat visits
    const reasonCounts = {};
    repeatVisitors.forEach((r) => {
      r.visits.slice(1).forEach((v) => {
        const reason = v.repeatReason || 'Follow-up on Previous Enquiry';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
    });

    const repeatReasonsBreakdown = Object.keys(reasonCounts)
      .map((reason) => ({
        reason,
        count: reasonCounts[reason],
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalRepeatCustomers: repeatCustGroups.length,
      twoVisitsCount,
      threeVisitsCount,
      moreThanThreeCount,
      convertedCount,
      repeatConversionRate,
      repeatReasonsBreakdown,
      repeatVisitors,
    });
  } catch (err) {
    console.error('getRepeatVisitorsAnalytics error:', err);
    res.status(500).json({ message: 'Failed to calculate repeat visitor analytics' });
  }
};

// @route GET /api/analytics/visitor-trend  [admin]
// Returns monthly customer visit counts for the last N months (default 6)
// Always returns ALL months in range — empty months filled with 0
const getVisitorTrend = async (req, res) => {
  try {
    const months = Math.max(6, parseInt(req.query.months) || 6);
    const now = new Date();

    // Pre-build all month slots (oldest → newest), each starting with 0
    const monthSlots = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSlots.push({
        month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        year: d.getFullYear(),
        monthNum: d.getMonth() + 1,
        customersVisited: 0,
      });
    }

    // Fetch aggregated visit counts from DB for the full range
    const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);

    const dbData = await Visit.aggregate([
      {
        $match: {
          $or: [
            { visitDate: { $gte: since } },
            { visitDate: { $exists: false }, createdAt: { $gte: since } },
          ],
        },
      },
      {
        $addFields: {
          effectiveDate: { $ifNull: ['$visitDate', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$effectiveDate' },
            month: { $month: '$effectiveDate' },
          },
          customersVisited: { $sum: 1 },
        },
      },
    ]);

    // Merge real counts into pre-built slots (months with no data remain 0)
    dbData.forEach(({ _id, customersVisited }) => {
      const slot = monthSlots.find(s => s.year === _id.year && s.monthNum === _id.month);
      if (slot) slot.customersVisited = customersVisited;
    });

    res.json(monthSlots.map(({ month, customersVisited }) => ({ month, customersVisited })));
  } catch (err) {
    console.error('getVisitorTrend error:', err);
    res.status(500).json({ message: 'Failed to fetch visitor trend' });
  }
};

module.exports = {
  getDashboardMetrics,
  getFeedbackTrend,
  getRatingDistribution,
  getStaffPerformanceAll,
  getComplaintCategories,
  getPurchaseAnalytics,
  getRepeatVisitorsAnalytics,
  getVisitorTrend,
};
