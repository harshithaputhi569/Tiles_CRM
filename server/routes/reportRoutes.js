const express = require('express');
const router = express.Router();
const { exportFeedbackExcel, exportFeedbackData } = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/export', exportFeedbackExcel);
router.get('/export-data', exportFeedbackData);

module.exports = router;
