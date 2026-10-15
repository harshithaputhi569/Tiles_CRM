const express = require('express');
const router = express.Router();
const { getFeedbacks, createFeedback, createPublicFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

// Public route — customers submit their feedback via unique token link
router.post('/public/:token', createPublicFeedback);

// Protected routes
router.get('/', protect, getFeedbacks);
router.post('/', protect, createFeedback);

module.exports = router;
