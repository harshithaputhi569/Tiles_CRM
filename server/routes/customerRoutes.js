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

router.use(protect);
router.get('/customers', getCustomers);
router.get('/customers/no-visit', getCustomersWithNoVisit);
router.get('/customers/:id/history', getCustomerHistory);
router.post('/customers', createCustomer);
router.get('/visits', getVisits);
router.post('/visits', createVisit);

module.exports = router;
