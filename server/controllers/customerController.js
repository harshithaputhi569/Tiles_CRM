const Customer = require('../models/Customer');
const Visit = require('../models/Visit');
const Notification = require('../models/Notification');
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

  const [visits, total, purchasedCount, notPurchasedCount, convertedCustomers, feedbackSentCount, billingAgg] = await Promise.all([
    query.skip((page - 1) * limit).limit(Number(limit)),
    Visit.countDocuments(filter),
    Visit.countDocuments({ ...filter, purchaseStatus: 'Purchased' }),
    Visit.countDocuments({ ...filter, purchaseStatus: 'Not Purchased' }),
    Visit.distinct('customer', { ...filter, purchaseStatus: 'Purchased' }),
    Visit.countDocuments({ ...filter, feedbackSubmitted: true }),
    Visit.aggregate([
      { $match: filter },
      { $group: { _id: null, totalBilling: { $sum: '$totalBillingValue' } } },
    ]),
  ]);

  const totalBillingValue = billingAgg.length > 0 ? (billingAgg[0].totalBilling || 0) : 0;
  const conversionRate = total > 0 ? parseFloat(((purchasedCount / total) * 100).toFixed(1)) : 0;
  const convertedCustomersCount = convertedCustomers.length;

  res.json({
    visits,
    total,
    pages: Math.ceil(total / limit),
    stats: {
      totalVisits: total,
      purchasedCount,
      notPurchasedCount,
      convertedCustomersCount,
      conversionRate,
      totalBillingValue,
      feedbackSentCount,
    },
  });
};

// @route POST /api/visits
// Creates a visit. Customer must already exist (pass customer ID) or be created first via POST /customers.
const createVisit = async (req, res) => {
  const { customer: customerId, source, purchaseStatus, nonPurchaseReason, repeatReason, specialDayDate, specialDayReason } = req.body;

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
    specialDayDate: specialDayDate ? new Date(specialDayDate) : null,
    specialDayReason: specialDayReason || '',
  });

  const populated = await visit.populate([
    { path: 'customer', select: 'name mobile customerType source address' },
    { path: 'staff', select: 'name designation' },
  ]);

  // Build the feedback link (client URL) - use 127.0.0.1 so WhatsApp detects it as a clickable URL with dots
  const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5173';
  const feedbackLink = `${clientUrl}/feedback/${feedbackToken}`;

  // Automatically dispatch live customer notifications to Admin and Attending Staff
  try {
    const custName = customerExists.name || 'Customer';
    const custMobile = customerExists.mobile || '';
    const custType = customerExists.customerType || 'New Customer';
    const custAddress = customerExists.address || '';
    const staffName = req.user.name || 'Staff Member';
    const purpose = visit.purpose || 'Showroom Visit';
    const pStatus = visit.purchaseStatus || 'Purchased';
    const billing = Number(visit.totalBillingValue) || 0;
    const stockReq = visit.stockRequested || '';
    const stockAvail = visit.stockAvailable || 'Yes';
    const stockNote = visit.stockNotes || '';
    const leadSrc = visit.source || customerExists.source || 'Walk-in / Signboard';
    const visitNotes = visit.notes || '';

    const visitMetadata = {
      customerName: custName,
      customerMobile: custMobile,
      customerType: custType,
      address: custAddress,
      staffName,
      staffId: req.user._id,
      visitId: visit._id,
      visitPurpose: purpose,
      purchaseStatus: pStatus,
      totalBillingValue: billing,
      nonPurchaseReason: visit.nonPurchaseReason || '',
      isRepeatVisit,
      visitNumber,
      repeatReason: visit.repeatReason || '',
      stockRequested: stockReq,
      stockAvailable: stockAvail,
      stockNotes: stockNote,
      source: leadSrc,
      notes: visitNotes,
      feedbackToken,
      feedbackLink,
      visitDate: visit.visitDate || new Date(),
    };

    // 1. Live Notification to Admin (New customer or repeat customer visit sent by staff)
    const adminTitle = isRepeatVisit
      ? `🔁 Repeat Customer Visit (#${visitNumber}): ${custName}`
      : `👤 Live Customer Visit: ${custName}`;
    const adminMsg = `${staffName} logged customer ${custName} (${custMobile}) • ${purpose} • Status: ${pStatus}${
      pStatus === 'Purchased' && billing > 0 ? ` (₹${billing.toLocaleString('en-IN')})` : ''
    }${stockReq ? ` • Stock: ${stockReq} [${stockAvail}]` : ''}`;

    await Notification.createIfNotExists({
      recipient: null,
      role: 'admin',
      title: adminTitle,
      message: adminMsg,
      type: 'visit',
      referenceId: visit._id,
      metadata: visitMetadata,
      link: '/admin/visits',
    });

    // 2. Live Notification to the Attending Staff
    const staffTitle = isRepeatVisit
      ? `🔁 Repeat Visit (#${visitNumber}) Registered: ${custName}`
      : `✅ Customer Visit Registered: ${custName}`;
    const staffMsg = `Customer ${custName} (${custMobile}) logged for ${purpose} • Status: ${pStatus}${
      billing > 0 ? ` (₹${billing.toLocaleString('en-IN')})` : ''
    }`;

    await Notification.createIfNotExists({
      recipient: req.user._id,
      role: 'staff',
      title: staffTitle,
      message: staffMsg,
      type: 'visit',
      referenceId: visit._id,
      metadata: visitMetadata,
      link: '/staff/my-visits',
    });

    // 3. If a Special Day Date was provided, also add it to visitMetadata and
    //    create exactly ONE special day notification for both admin & staff.
    if (visit.specialDayDate && visit.specialDayReason) {
      const now = new Date();
      const sd = new Date(visit.specialDayDate);
      const isToday =
        sd.getFullYear() === now.getFullYear() &&
        sd.getMonth() === now.getMonth() &&
        sd.getDate() === now.getDate();

      const sdFormatted = sd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const sdMeta = { ...visitMetadata, specialDayDate: visit.specialDayDate, specialDayReason: visit.specialDayReason };

      const sdTitle = isToday
        ? `🎉 Today is a Special Day! – ${custName}`
        : `🎉 Special Day Scheduled: ${custName}`;

      const sdAdminMsg = isToday
        ? `${custName} (${custMobile}) has a special occasion today: "${visit.specialDayReason}" (Registered by ${staffName})`
        : `${custName}'s special occasion "${visit.specialDayReason}" is on ${sdFormatted}. Registered by ${staffName}.`;

      const sdStaffMsg = isToday
        ? `${custName} (${custMobile}) has a special occasion today: "${visit.specialDayReason}". Wish them! 🎉`
        : `You marked ${sdFormatted} as a special day for ${custName}: "${visit.specialDayReason}". You'll be reminded on the day!`;

      // Notify admin (deduplicated)
      await Notification.createIfNotExists({
        recipient: null,
        role: 'admin',
        title: sdTitle,
        message: sdAdminMsg,
        type: 'general',
        referenceId: visit._id,
        metadata: sdMeta,
        link: '/admin/visits',
      });

      // Notify the attending staff (deduplicated)
      await Notification.createIfNotExists({
        recipient: req.user._id,
        role: 'staff',
        title: sdTitle,
        message: sdStaffMsg,
        type: 'general',
        referenceId: visit._id,
        metadata: sdMeta,
        link: '/staff/my-visits',
      });
    }
  } catch (notifErr) {
    console.error('Customer visit notification dispatch error (non-fatal):', notifErr);
  }

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

// @route PUT /api/visits/:id
// Allows staff or admin to instantly enter/update totalBillingValue, purchase outcome, and notes
const updateVisit = async (req, res) => {
  try {
    const { totalBillingValue, purchaseStatus, nonPurchaseReason, notes, purpose, stockRequested, stockAvailable, stockNotes } = req.body;
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (totalBillingValue !== undefined) {
      visit.totalBillingValue = Math.max(0, Number(totalBillingValue) || 0);
    }
    if (purchaseStatus !== undefined) {
      visit.purchaseStatus = purchaseStatus;
      if (purchaseStatus !== 'Not Purchased') visit.nonPurchaseReason = '';
    }
    if (nonPurchaseReason !== undefined) {
      visit.nonPurchaseReason = nonPurchaseReason;
    }
    if (stockRequested !== undefined) {
      visit.stockRequested = stockRequested;
    }
    if (stockAvailable !== undefined) {
      visit.stockAvailable = stockAvailable;
    }
    if (stockNotes !== undefined) {
      visit.stockNotes = stockNotes;
    }
    if (notes !== undefined) {
      visit.notes = notes;
    }
    if (purpose !== undefined) {
      visit.purpose = purpose;
    }

    await visit.save();

    // Sync metadata to existing visit notification if present
    try {
      await Notification.updateMany(
        { referenceId: visit._id, type: 'visit' },
        {
          $set: {
            'metadata.purchaseStatus': visit.purchaseStatus,
            'metadata.totalBillingValue': visit.totalBillingValue,
            'metadata.nonPurchaseReason': visit.nonPurchaseReason,
            'metadata.stockRequested': visit.stockRequested,
            'metadata.stockAvailable': visit.stockAvailable,
            'metadata.stockNotes': visit.stockNotes,
            'metadata.notes': visit.notes,
            'metadata.visitPurpose': visit.purpose,
          },
        }
      );
    } catch (syncErr) {
      console.error('Failed to sync notification metadata on visit update:', syncErr);
    }

    const populated = await visit.populate([
      { path: 'customer', select: 'name mobile customerType source address' },
      { path: 'staff', select: 'name designation' },
    ]);

    res.json(populated);
  } catch (err) {
    console.error('updateVisit error:', err);
    res.status(500).json({ message: 'Failed to update visit' });
  }
};

module.exports = {
  getCustomers,
  getCustomerHistory,
  createCustomer,
  getCustomersWithNoVisit,
  getVisits,
  createVisit,
  updateVisit,
  getVisitByFeedbackToken,
};
