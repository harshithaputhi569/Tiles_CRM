const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Visit = require('../models/Visit');
const Complaint = require('../models/Complaint');

// @route GET /api/staff  [admin]
const getAllStaff = async (req, res) => {
  const staff = await User.find({ role: 'staff' }).select('-password').sort({ createdAt: -1 });
  res.json(staff);
};

// @route POST /api/staff  [admin]
const createStaff = async (req, res) => {
  const { name, email, password, phone, designation } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const staff = await User.create({ name, email, password, phone, designation, role: 'staff' });
  res.status(201).json({ _id: staff._id, name: staff.name, email: staff.email, role: staff.role });
};

// @route PUT /api/staff/:id  [admin]
const updateStaff = async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff || staff.role !== 'staff') return res.status(404).json({ message: 'Staff not found' });
  const { name, email, phone, designation, isActive, password } = req.body;
  staff.name = name || staff.name;
  staff.email = email || staff.email;
  staff.phone = phone || staff.phone;
  staff.designation = designation || staff.designation;
  if (isActive !== undefined) staff.isActive = isActive;
  if (password) staff.password = password;
  await staff.save();
  res.json({ message: 'Staff updated', staff });
};

// @route DELETE /api/staff/:id  [admin]
const deleteStaff = async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff) return res.status(404).json({ message: 'Staff not found' });
  await staff.deleteOne();
  res.json({ message: 'Staff removed' });
};

// @route GET /api/staff/:id/performance  [admin]
const getStaffPerformance = async (req, res) => {
  const staffId = req.params.id;
  const feedbacks = await Feedback.find({ staff: staffId });
  const visits = await Visit.countDocuments({ staff: staffId });
  const complaints = await Complaint.countDocuments({ staff: staffId });
  const resolvedComplaints = await Complaint.countDocuments({ staff: staffId, status: 'Resolved' });

  if (!feedbacks.length) return res.json({ visits, feedbacks: 0, avgRating: 0, performanceScore: 0 });

  const count = feedbacks.length;
  const avgBehaviour = feedbacks.reduce((s, f) => s + f.ratings.behaviour, 0) / count;
  const avgHelpfulness = feedbacks.reduce((s, f) => s + f.ratings.helpfulness, 0) / count;
  const avgProductKnowledge = feedbacks.reduce((s, f) => s + f.ratings.productKnowledge, 0) / count;
  const avgRating = feedbacks.reduce((s, f) => s + f.overallRating, 0) / count;
  const satisfaction = feedbacks.filter((f) => f.overallRating >= 4).length / count;
  const complaintRate = complaints > 0 ? resolvedComplaints / complaints : 1;

  const performanceScore =
    satisfaction * 30 +
    (avgBehaviour / 5) * 25 +
    (avgHelpfulness / 5) * 20 +
    (avgProductKnowledge / 5) * 15 +
    complaintRate * 10;

  res.json({
    visits,
    feedbackCount: count,
    avgRating: parseFloat(avgRating.toFixed(2)),
    avgBehaviour: parseFloat(avgBehaviour.toFixed(2)),
    avgHelpfulness: parseFloat(avgHelpfulness.toFixed(2)),
    avgProductKnowledge: parseFloat(avgProductKnowledge.toFixed(2)),
    satisfactionRate: parseFloat((satisfaction * 100).toFixed(1)),
    complaints,
    resolvedComplaints,
    performanceScore: parseFloat(performanceScore.toFixed(1)),
  });
};

module.exports = { getAllStaff, createStaff, updateStaff, deleteStaff, getStaffPerformance };
