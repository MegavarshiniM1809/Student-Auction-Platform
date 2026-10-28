const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getAuctions,
  createAuction,
  getAuction,
  updateAuction,
  cancelAuction,
  placeBid,
  getBids,
  sellerDecision,
} = require('../controllers/auctionController');

router.get('/', getAuctions);
router.post('/', protect, upload.array('photos', 5), createAuction);
router.get('/:id', getAuction);
router.patch('/:id', protect, updateAuction);
router.post('/:id/cancel', protect, cancelAuction);
router.post('/:id/bids', protect, placeBid);
router.get('/:id/bids', getBids);
router.post('/:id/decision', protect, sellerDecision);

module.exports = router;
