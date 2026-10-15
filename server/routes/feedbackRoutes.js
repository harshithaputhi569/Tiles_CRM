const express = require('express');
const router = express.Router();
const { getFeedbacks, createFeedback, createPublicFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

// Public route — customers submit their feedback via unique token link
router.post('/public/:token', createPublicFeedback);

router.use(protect);
router.get('/', getFeedbacks);
router.post('/', createFeedback);

module.exports = router;
