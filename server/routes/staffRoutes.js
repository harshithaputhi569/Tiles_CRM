const express = require('express');
const router = express.Router();
const { getAllStaff, createStaff, updateStaff, deleteStaff, getStaffPerformance } = require('../controllers/staffController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', adminOnly, getAllStaff);
router.post('/', adminOnly, createStaff);
router.put('/:id', adminOnly, updateStaff);
router.delete('/:id', adminOnly, deleteStaff);
router.get('/:id/performance', adminOnly, getStaffPerformance);

module.exports = router;
