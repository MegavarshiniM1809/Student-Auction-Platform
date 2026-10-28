const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  cancelTransaction,
  confirmHandover,
  pickupFailed,
} = require('../controllers/transactionController');

router.post('/:id/cancel', protect, cancelTransaction);
router.post('/:id/handover', protect, confirmHandover);
router.post('/:id/pickup-failed', protect, pickupFailed);

module.exports = router;
