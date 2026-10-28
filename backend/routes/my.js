const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyListings, getMyBids } = require('../controllers/auctionController');
const { getMyTransactions } = require('../controllers/transactionController');

router.get('/listings', protect, getMyListings);
router.get('/bids', protect, getMyBids);
router.get('/transactions', protect, getMyTransactions);

module.exports = router;
