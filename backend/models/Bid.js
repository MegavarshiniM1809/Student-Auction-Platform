const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    bidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true }, // paise
    sequenceNumber: { type: Number, required: true },
    isValid: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bidSchema.index({ auctionId: 1, sequenceNumber: 1 });
bidSchema.index({ bidderId: 1 });

module.exports = mongoose.model('Bid', bidSchema);
