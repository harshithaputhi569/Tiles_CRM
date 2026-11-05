const Feedback = require('../models/Feedback');
const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// @route GET /api/feedback
const getFeedbacks = async (req, res) => {
  try {
    const {
      staff,
      rating,
      startDate,
      endDate,
      hasComplaint,
      isRead,
      unreadOnly,
      isPinned,
      pinnedOnly,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (staff) filter.staff = staff;
    if (rating) filter.overallRating = { $gte: Number(rating), $lt: Number(rating) + 1 };
    if (hasComplaint !== undefined && hasComplaint !== '') filter.hasComplaint = hasComplaint === 'true';

    // Read / Unread status filter
    if (unreadOnly === 'true' || isRead === 'false') {
      filter.isRead = { $ne: true };
    } else if (isRead === 'true') {
      filter.isRead = true;
    }

    // Pinned status filter
    if (pinnedOnly === 'true' || isPinned === 'true') {
      filter.isPinned = true;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Staff role restriction: only see their own customer feedback
    if (req.user.role === 'staff') filter.staff = req.user._id;

    // Search query matching customer name/phone, staff name, comments, or suggestions
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const [matchingCustomers, matchingStaff] = await Promise.all([
        Customer.find({
          $or: [
            { name: searchRegex },
            { mobile: searchRegex },
            { customerType: searchRegex },
          ],
        }).select('_id'),
        User.find({ name: searchRegex }).select('_id'),
      ]);

      const custIds = matchingCustomers.map((c) => c._id);
      const staffIds = matchingStaff.map((s) => s._id);

      filter.$or = [
        { comments: searchRegex },
        { suggestions: searchRegex },
        { customer: { $in: custIds } },
        { staff: { $in: staffIds } },
      ];
    }

    // Always sort pinned items first, then by date descending
    const feedbacks = await Feedback.find(filter)
      .populate('customer', 'name mobile customerType')
      .populate('staff', 'name designation')
      .populate({ path: 'visit', select: 'purpose visitDate' })
      .sort({ isPinned: -1, pinnedAt: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Feedback.countDocuments(filter);

    // Contextual counts for tabs / quick badges
    const roleBaseFilter = req.user.role === 'staff' ? { staff: req.user._id } : {};
    const [unreadCount, pinnedCount, totalAll] = await Promise.all([
      Feedback.countDocuments({ ...roleBaseFilter, isRead: { $ne: true } }),
      Feedback.countDocuments({ ...roleBaseFilter, isPinned: true }),
      Feedback.countDocuments(roleBaseFilter),
    ]);

    res.json({
      feedbacks,
      total,
      unreadCount,
      pinnedCount,
      totalAll,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getFeedbacks error:', err);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

// @route POST /api/feedback  (authenticated staff)
const createFeedback = async (req, res) => {
  const { visitId, ratings, recommendationScore, comments, suggestions, hasComplaint, complaintCategory, complaintDescription } = req.body;

  const visit = await Visit.findById(visitId)
    .populate('customer', 'name mobile')
    .populate('staff', 'name');
  if (!visit) return res.status(404).json({ message: 'Visit not found' });

  const feedback = await Feedback.create({
    visit: visitId,
    customer: visit.customer._id || visit.customer,
    staff: visit.staff._id || visit.staff,
    ratings,
    recommendationScore,
    comments,
    suggestions,
    hasComplaint,
  });

  visit.feedbackSubmitted = true;
  await visit.save();

  if (hasComplaint && complaintDescription) {
    await Complaint.create({
      feedback: feedback._id,
      customer: visit.customer._id || visit.customer,
      staff: visit.staff._id || visit.staff,
      category: complaintCategory || 'Other',
      description: complaintDescription,
    });
  }

  // Dispatch notifications to staff and admin
  try {
    const customerName = visit.customer?.name || 'Customer';
    const customerMobile = visit.customer?.mobile || '';
    const staffName = visit.staff?.name || 'Staff Member';
    const ratingValues = Object.values(ratings || {});
    const avgRating = ratingValues.length > 0 ? parseFloat((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)) : 0;
    const notifMetadata = {
      customerName,
      customerMobile,
      staffName,
      rating: avgRating,
      ratings,
      recommendationScore,
      comments: comments || '',
      suggestions: suggestions || '',
      hasComplaint: !!hasComplaint,
      complaintCategory: complaintCategory || '',
      complaintDescription: complaintDescription || '',
      visitDate: visit.visitDate || new Date(),
    };

    await Notification.createIfNotExists({
      recipient: visit.staff._id || visit.staff,
      role: 'staff',
      title: hasComplaint ? '⚠️ Customer Feedback & Complaint Logged' : '⭐ New Customer Feedback Logged',
      message: `${customerName} rated their visit (${avgRating}★).${hasComplaint ? ` Note: A complaint was registered under "${complaintCategory}".` : ''}`,
      type: hasComplaint ? 'complaint' : 'feedback',
      referenceId: feedback._id,
      metadata: notifMetadata,
      link: '/staff/feedback',
    });

    await Notification.createIfNotExists({
      recipient: null,
      role: 'admin',
      title: hasComplaint ? '🚨 New Customer Complaint Raised' : '⭐ Customer Feedback Received',
      message: `${customerName} submitted ${avgRating}★ feedback for ${staffName}.${hasComplaint ? ` Complaint: ${complaintCategory}.` : ''}`,
      type: hasComplaint ? 'complaint' : 'feedback',
      referenceId: feedback._id,
      metadata: notifMetadata,
      link: '/admin/notifications',
    });
  } catch (err) {
    console.error('Notification dispatch error (non-fatal):', err);
  }

  res.status(201).json(feedback);
};

// @route POST /api/feedback/public/:token  (PUBLIC — no auth, customer-facing)
// Customer submits feedback via their unique visit feedback link
const createPublicFeedback = async (req, res) => {
  try {
    const { token } = req.params;
    const { ratings, recommendationScore, comments, suggestions, hasComplaint, complaintCategory, complaintDescription } = req.body;

    const isObjectId = mongoose.Types.ObjectId.isValid(token);
    const visit = await Visit.findOne({
      $or: [
        { feedbackToken: token },
        ...(isObjectId ? [{ _id: token }] : []),
      ],
    })
      .populate('customer', 'name mobile')
      .populate('staff', 'name designation');

    if (!visit) return res.status(404).json({ message: 'Invalid or expired feedback link.' });
    if (visit.feedbackSubmitted) return res.status(409).json({ message: 'Feedback already submitted for this visit.' });
    if (visit.feedbackTokenExpiry && new Date() > visit.feedbackTokenExpiry) {
      return res.status(410).json({ message: 'This feedback link has expired.' });
    }

    // Validate ratings
    const requiredRatings = ['behaviour', 'helpfulness', 'productKnowledge', 'tileCollection', 'pricingExplanation', 'overallExperience'];
    for (const r of requiredRatings) {
      if (!ratings || !ratings[r] || ratings[r] < 1 || ratings[r] > 5) {
        return res.status(400).json({ message: `Invalid rating for: ${r}` });
      }
    }
    if (!recommendationScore || recommendationScore < 1 || recommendationScore > 10) {
      return res.status(400).json({ message: 'Recommendation score must be between 1 and 10.' });
    }

    const feedback = await Feedback.create({
      visit: visit._id,
      customer: visit.customer._id,
      staff: visit.staff._id,
      ratings,
      recommendationScore,
      comments: comments || '',
      suggestions: suggestions || '',
      hasComplaint: hasComplaint || false,
    });

    visit.feedbackSubmitted = true;
    await visit.save();

    if (hasComplaint && complaintDescription) {
      await Complaint.create({
        feedback: feedback._id,
        customer: visit.customer._id,
        staff: visit.staff._id,
        category: complaintCategory || 'Other',
        description: complaintDescription,
      });
    }

    // Auto-dispatch notifications to Staff and Admin
    const customerName = visit.customer?.name || 'Customer';
    const customerMobile = visit.customer?.mobile || '';
    const staffName = visit.staff?.name || 'Staff Member';
    const ratingValues = Object.values(ratings);
    const avgRating = parseFloat((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1));
    const visitDate = visit.visitDate || visit.createdAt || new Date();

    const notifMetadata = {
      customerName,
      customerMobile,
      staffName,
      rating: avgRating,
      ratings,
      recommendationScore,
      comments: comments || '',
      suggestions: suggestions || '',
      hasComplaint: !!hasComplaint,
      complaintCategory: complaintCategory || '',
      complaintDescription: complaintDescription || '',
      visitDate,
    };

    try {
      // 1. Notification for the staff member
      await Notification.createIfNotExists({
        recipient: visit.staff._id,
        role: 'staff',
        title: hasComplaint ? '⚠️ Customer Feedback & Complaint Received' : '⭐ New Customer Feedback Received',
        message: `${customerName} rated their visit (${avgRating}★).${hasComplaint ? ` Note: A complaint was registered under "${complaintCategory}".` : ' Great work!' }`,
        type: hasComplaint ? 'complaint' : 'feedback',
        referenceId: feedback._id,
        metadata: notifMetadata,
        link: '/staff/feedback',
      });

      // 2. Notification for Admin
      await Notification.createIfNotExists({
        recipient: null,
        role: 'admin',
        title: hasComplaint ? '🚨 New Customer Complaint Raised' : '⭐ Customer Feedback Received',
        message: `${customerName} submitted ${avgRating}★ feedback for ${staffName}.${hasComplaint ? ` Complaint: ${complaintCategory}.` : ''}`,
        type: hasComplaint ? 'complaint' : 'feedback',
        referenceId: feedback._id,
        metadata: notifMetadata,
        link: '/admin/notifications',
      });
    } catch (notifErr) {
      console.error('Notification creation error (non-fatal):', notifErr);
    }

    res.status(201).json({ message: 'Thank you! Your feedback has been submitted.' });
  } catch (err) {
    console.error('Public feedback error:', err);
    res.status(500).json({ message: 'Failed to submit feedback. Please try again.' });
  }
};

// @route PATCH /api/feedback/:id/pin
const togglePinFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    if (req.user.role === 'staff' && feedback.staff && feedback.staff.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    feedback.isPinned = !feedback.isPinned;
    feedback.pinnedAt = feedback.isPinned ? new Date() : null;
    await feedback.save();

    const populated = await Feedback.findById(feedback._id)
      .populate('customer', 'name mobile customerType')
      .populate('staff', 'name designation')
      .populate({ path: 'visit', select: 'purpose visitDate' });

    res.json({
      message: feedback.isPinned ? 'Feedback pinned to top' : 'Feedback unpinned',
      feedback: populated,
    });
  } catch (err) {
    console.error('Toggle pin error:', err);
    res.status(500).json({ message: 'Failed to toggle pin status' });
  }
};

// @route PATCH /api/feedback/:id/read
const toggleReadFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    if (req.user.role === 'staff' && feedback.staff && feedback.staff.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (req.body.isRead !== undefined) {
      feedback.isRead = Boolean(req.body.isRead);
    } else {
      feedback.isRead = !feedback.isRead;
    }
    await feedback.save();

    const populated = await Feedback.findById(feedback._id)
      .populate('customer', 'name mobile customerType')
      .populate('staff', 'name designation')
      .populate({ path: 'visit', select: 'purpose visitDate' });

    res.json({
      message: feedback.isRead ? 'Feedback marked as read' : 'Feedback marked as unread',
      feedback: populated,
    });
  } catch (err) {
    console.error('Toggle read error:', err);
    res.status(500).json({ message: 'Failed to update read status' });
  }
};

// @route PATCH /api/feedback/mark-all-read
const markAllAsRead = async (req, res) => {
  try {
    const filter = { isRead: { $ne: true } };
    if (req.user.role === 'staff') {
      filter.staff = req.user._id;
    }
    const result = await Feedback.updateMany(filter, { $set: { isRead: true } });
    res.json({ message: 'All feedback marked as read', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Failed to mark all feedback as read' });
  }
};

// @route DELETE /api/feedback/:id (admin only)
const deleteFeedback = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete feedback records' });
    }
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    // Also remove associated complaints
    await Complaint.deleteMany({ feedback: feedback._id });

    // Reset visit feedbackSubmitted flag
    if (feedback.visit) {
      await Visit.findByIdAndUpdate(feedback.visit, { feedbackSubmitted: false });
    }

    // Remove notifications referencing this feedback
    await Notification.deleteMany({ referenceId: feedback._id });

    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted successfully', deletedId: req.params.id });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ message: 'Failed to delete feedback' });
  }
};

module.exports = {
  getFeedbacks,
  createFeedback,
  createPublicFeedback,
  togglePinFeedback,
  toggleReadFeedback,
  markAllAsRead,
  deleteFeedback,
};
