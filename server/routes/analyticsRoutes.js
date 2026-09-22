const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getFeedbackTrend,
  getRatingDistribution,
  getStaffPerformanceAll,
  getComplaintCategories,
} = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/dashboard', getDashboardMetrics);
router.get('/feedback-trend', getFeedbackTrend);
router.get('/rating-distribution', getRatingDistribution);
router.get('/staff-performance', getStaffPerformanceAll);
router.get('/complaint-categories', getComplaintCategories);

module.exports = router;
