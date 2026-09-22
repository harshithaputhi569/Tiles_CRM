const Customer = require('../models/Customer');
const Visit = require('../models/Visit');

// @route GET /api/customers
const getCustomers = async (req, res) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json(customers);
};

// @route POST /api/customers
const createCustomer = async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json(customer);
};

// @route GET /api/visits
const getVisits = async (req, res) => {
  const { staff, date, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (staff) filter.staff = staff;
  if (date) {
    const d = new Date(date);
    filter.visitDate = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
  }
  const visits = await Visit.find(filter)
    .populate('customer', 'name mobile customerType')
    .populate('staff', 'name designation')
    .sort({ visitDate: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await Visit.countDocuments(filter);
  res.json({ visits, total, pages: Math.ceil(total / limit) });
};

// @route POST /api/visits
const createVisit = async (req, res) => {
  const visit = await Visit.create({ ...req.body, staff: req.user._id });
  const populated = await visit.populate([
    { path: 'customer', select: 'name mobile customerType' },
    { path: 'staff', select: 'name designation' },
  ]);
  res.status(201).json(populated);
};

module.exports = { getCustomers, createCustomer, getVisits, createVisit };
