const express = require('express');
const router = express.Router();
const {
  getFeedbacks,
  createFeedback,
  createPublicFeedback,
  togglePinFeedback,
  toggleReadFeedback,
  markAllAsRead,
  deleteFeedback,
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

// Public route — customers submit their feedback via unique token link
router.post('/public/:token', createPublicFeedback);

// Protected routes
router.get('/', protect, getFeedbacks);
router.post('/', protect, createFeedback);
router.patch('/mark-all-read', protect, markAllAsRead);
router.patch('/:id/pin', protect, togglePinFeedback);
router.patch('/:id/read', protect, toggleReadFeedback);
router.delete('/:id', protect, deleteFeedback);

module.exports = router;
