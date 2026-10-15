const Notification = require('../models/Notification');

// @route GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const query = {
      $or: [
        { recipient: userId },
        { role: userRole },
        { role: 'all' },
      ],
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30);

    // Compute unread count for current user
    const unreadCount = notifications.filter((n) => {
      const isReadByUser = n.readBy?.some((id) => id.toString() === userId.toString());
      return !n.isRead && !isReadByUser;
    }).length;

    res.json({
      notifications: notifications.map((n) => ({
        ...n.toObject(),
        unread: !n.isRead && !n.readBy?.some((id) => id.toString() === userId.toString()),
      })),
      unreadCount,
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// @route PUT /api/notifications/:id/read
const markNotificationAsRead = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    if (!notif.readBy.some((id) => id.toString() === req.user._id.toString())) {
      notif.readBy.push(req.user._id);
    }
    notif.isRead = true;
    await notif.save();

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification' });
  }
};

// @route PUT /api/notifications/mark-all-read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const query = {
      $or: [
        { recipient: userId },
        { role: userRole },
        { role: 'all' },
      ],
    };

    await Notification.updateMany(query, {
      $addToSet: { readBy: userId },
      $set: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
