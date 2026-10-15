const Customer = require('../models/Customer');
const Visit = require('../models/Visit');
const crypto = require('crypto');
const mongoose = require('mongoose');

// @route GET /api/customers
const getCustomers = async (req, res) => {
  const { search } = req.query;
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
        ],
      }
    : {};
  const customers = await Customer.find(filter).sort({ createdAt: -1 });
  res.json(customers);
};

// @route GET /api/customers/:id/history
// Returns full visit history for a customer to notify staff/admin of previous visits & reasons
const getCustomerHistory = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const visits = await Visit.find({ customer: customer._id })
      .populate('staff', 'name designation')
      .sort({ visitDate: 1, createdAt: 1 });

    const totalVisits = visits.length;
    const isRepeatVisitor = totalVisits >= 1; // if 1, the upcoming visit is #2; if 2, upcoming is #3!

    res.json({
      customer,
      totalVisits,
      nextVisitNumber: totalVisits + 1,
      isRepeatVisitor,
      previousVisits: visits,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customer history' });
  }
};

// @route POST /api/customers
// Standalone customer creation — checks for duplicate mobile first
const createCustomer = async (req, res) => {
  const { mobile, source } = req.body;
  const existing = await Customer.findOne({ mobile });
  if (existing) {
    if (source && (!existing.source || existing.source === 'Walk-in / Signboard')) {
      existing.source = source;
      await existing.save();
    }
    return res.status(409).json({
      message: 'A customer with this mobile number already exists.',
      customer: existing,
    });
  }
  const customer = await Customer.create(req.body);
  res.status(201).json(customer);
};

// @route GET /api/customers/no-visit
// Returns customers registered but never visited (data gap report)
const getCustomersWithNoVisit = async (req, res) => {
  const visitedCustomerIds = await Visit.distinct('customer');
  const customers = await Customer.find({
    _id: { $nin: visitedCustomerIds },
  }).sort({ createdAt: -1 });
  res.json(customers);
};

// @route GET /api/visits
const getVisits = async (req, res) => {
  const { staff, customer, date, startDate, endDate, purchaseStatus, source, search, isRepeatVisit, page = 1, limit = 20 } = req.query;
  const filter = {};

  // Customer filter
  if (customer) filter.customer = customer;

  // Staff filter
  if (staff) filter.staff = staff;
  else if (req.user && req.user.role === 'staff' && !req.query.all) {
    filter.staff = req.user._id;
  }

  // Repeat visit filter
  if (isRepeatVisit !== undefined) {
    filter.isRepeatVisit = isRepeatVisit === 'true';
  }

  // Date filters
  if (startDate || endDate) {
    filter.visitDate = {};
    if (startDate) filter.visitDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.visitDate.$lte = end;
    }
  } else if (date) {
    const d = new Date(date);
    filter.visitDate = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
  }

  // Purchase status filter
  if (purchaseStatus && purchaseStatus !== 'all') {
    filter.purchaseStatus = purchaseStatus;
  }

  // Source filter
  if (source && source !== 'all') {
    filter.source = source;
  }

  let query = Visit.find(filter)
    .populate('customer', 'name mobile customerType source address')
    .populate('staff', 'name designation')
    .sort({ visitDate: -1, createdAt: -1 });

  // If search query is provided, match against customer name or mobile
  if (search) {
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const customerIds = matchingCustomers.map((c) => c._id);
    filter.customer = { $in: customerIds };
    query = Visit.find(filter)
      .populate('customer', 'name mobile customerType source address')
      .populate('staff', 'name designation')
      .sort({ visitDate: -1, createdAt: -1 });
  }

  const visits = await query.skip((page - 1) * limit).limit(Number(limit));
  const total = await Visit.countDocuments(filter);

  res.json({ visits, total, pages: Math.ceil(total / limit) });
};

// @route POST /api/visits
// Creates a visit. Customer must already exist (pass customer ID) or be created first via POST /customers.
const createVisit = async (req, res) => {
  const { customer: customerId, source, purchaseStatus, nonPurchaseReason, repeatReason } = req.body;

  // Verify the customer exists before logging a visit
  const customerExists = await Customer.findById(customerId);
  if (!customerExists) {
    return res.status(404).json({ message: 'Customer not found. Please register the customer first.' });
  }

  // Count prior visits for this customer to determine visit number & repeat status
  const previousVisitsCount = await Visit.countDocuments({ customer: customerId });
  const visitNumber = previousVisitsCount + 1;
  const isRepeatVisit = visitNumber >= 2;

  // Sync source to customer if customer doesn't have one
  if (source && (!customerExists.source || customerExists.source === 'Walk-in / Signboard')) {
    customerExists.source = source;
    await customerExists.save();
  }

  // Generate unique feedback token (30-day expiry)
  const feedbackToken = crypto.randomBytes(24).toString('hex');
  const feedbackTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const visit = await Visit.create({
    ...req.body,
    visitNumber,
    isRepeatVisit,
    repeatReason: isRepeatVisit ? (repeatReason || 'Follow-up on Previous Enquiry') : '',
    purchaseStatus: purchaseStatus || 'Purchased',
    nonPurchaseReason: (purchaseStatus === 'Not Purchased') ? (nonPurchaseReason || 'Other') : '',
    source: source || customerExists.source || 'Walk-in / Signboard',
    staff: req.user._id,
    feedbackToken,
    feedbackTokenExpiry,
  });

  const populated = await visit.populate([
    { path: 'customer', select: 'name mobile customerType source address' },
    { path: 'staff', select: 'name designation' },
  ]);

  // Build the feedback link (client URL)
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const feedbackLink = `${clientUrl}/feedback/${feedbackToken}`;

  res.status(201).json({ ...populated.toObject(), feedbackLink });
};

// @route GET /api/visits/feedback-form/:token  (PUBLIC — no auth)
// Used by the customer to load their feedback form
const getVisitByFeedbackToken = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.token);
    const visit = await Visit.findOne({
      $or: [
        { feedbackToken: req.params.token },
        ...(isObjectId ? [{ _id: req.params.token }] : []),
      ],
    })
      .populate('customer', 'name mobile')
      .populate('staff', 'name designation');

    if (!visit) return res.status(404).json({ message: 'Invalid or expired feedback link.' });
    if (visit.feedbackSubmitted) return res.status(409).json({ message: 'Feedback already submitted for this visit.' });
    if (visit.feedbackTokenExpiry && new Date() > visit.feedbackTokenExpiry) {
      return res.status(410).json({ message: 'This feedback link has expired.' });
    }

    // Return only safe public fields — no private customer info exposed
    res.json({
      visitId: visit._id,
      visitNumber: visit.visitNumber,
      visitDate: visit.visitDate,
      purpose: visit.purpose,
      customerName: visit.customer?.name,
      staffName: visit.staff?.name,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCustomers,
  getCustomerHistory,
  createCustomer,
  getCustomersWithNoVisit,
  getVisits,
  createVisit,
  getVisitByFeedbackToken,
};
