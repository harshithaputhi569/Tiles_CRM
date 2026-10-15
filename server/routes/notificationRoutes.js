const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getNotifications);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.put('/:id/read', markNotificationAsRead);

module.exports = router;
