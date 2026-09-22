const express = require('express');
const router = express.Router();
const { exportFeedbackExcel } = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/export', exportFeedbackExcel);

module.exports = router;
