const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getFeedbackTrend,
  getRatingDistribution,
  getStaffPerformanceAll,
  getComplaintCategories,
  getPurchaseAnalytics,
  getRepeatVisitorsAnalytics,
  getVisitorTrend,
} = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

// Accessible to both staff and admin
router.get('/purchase-conversion', protect, getPurchaseAnalytics);
router.get('/repeat-visitors', protect, getRepeatVisitorsAnalytics);

// Admin-only analytics routes
router.get('/dashboard', protect, adminOnly, getDashboardMetrics);
router.get('/feedback-trend', protect, adminOnly, getFeedbackTrend);
router.get('/rating-distribution', protect, adminOnly, getRatingDistribution);
router.get('/staff-performance', protect, adminOnly, getStaffPerformanceAll);
router.get('/complaint-categories', protect, adminOnly, getComplaintCategories);
router.get('/visitor-trend', protect, adminOnly, getVisitorTrend);

module.exports = router;
