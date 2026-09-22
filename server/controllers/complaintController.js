const Complaint = require('../models/Complaint');

// @route GET /api/complaints
const getComplaints = async (req, res) => {
  const { status, category, staff } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (staff) filter.staff = staff;
  if (req.user.role === 'staff') filter.staff = req.user._id;

  const complaints = await Complaint.find(filter)
    .populate('customer', 'name mobile')
    .populate('staff', 'name designation')
    .sort({ createdAt: -1 });
  res.json(complaints);
};

// @route PUT /api/complaints/:id  [admin]
const updateComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  const { status, adminRemarks } = req.body;
  complaint.status = status || complaint.status;
  complaint.adminRemarks = adminRemarks || complaint.adminRemarks;
  if (status === 'Resolved' && !complaint.resolvedAt) complaint.resolvedAt = new Date();
  await complaint.save();
  res.json(complaint);
};

module.exports = { getComplaints, updateComplaint };
