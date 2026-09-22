const express = require('express');
const router = express.Router();
const { getComplaints, updateComplaint } = require('../controllers/complaintController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', getComplaints);
router.put('/:id', adminOnly, updateComplaint);

module.exports = router;
