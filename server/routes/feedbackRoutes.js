const express = require('express');
const router = express.Router();
const { getFeedbacks, createFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getFeedbacks);
router.post('/', createFeedback);

module.exports = router;
