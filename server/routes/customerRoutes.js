const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerHistory,
  createCustomer,
  getCustomersWithNoVisit,
  getVisits,
  createVisit,
  getVisitByFeedbackToken,
} = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

// Public route — customer accesses their feedback form via unique token
router.get('/visits/feedback-form/:token', getVisitByFeedbackToken);

// Protected routes
router.get('/customers', protect, getCustomers);
router.get('/customers/no-visit', protect, getCustomersWithNoVisit);
router.get('/customers/:id/history', protect, getCustomerHistory);
router.post('/customers', protect, createCustomer);
router.get('/visits', protect, getVisits);
router.post('/visits', protect, createVisit);

module.exports = router;
