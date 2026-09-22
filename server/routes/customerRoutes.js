const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer, getVisits, createVisit } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/visits', getVisits);
router.post('/visits', createVisit);

module.exports = router;
