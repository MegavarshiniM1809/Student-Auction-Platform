const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadPhotos } = require('../config/cloudinary');
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
router.post('/', protect, uploadPhotos, createAuction);
router.get('/:id', getAuction);
router.patch('/:id', protect, uploadPhotos, updateAuction);
router.post('/:id/cancel', protect, cancelAuction);
router.post('/:id/bids', protect, placeBid);
router.get('/:id/bids', getBids);
router.post('/:id/decision', protect, sellerDecision);

module.exports = router;
