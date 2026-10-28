const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    winningBid: { type: Number, required: true }, // paise
    sellerDecision: {
      type: String,
      enum: ['APPROVED', 'REJECTED', null],
      default: null,
    },
    pickupDeadline: { type: Date, default: null },
    finalOutcome: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED', 'PICKUP_FAILED', null],
      default: null,
    },
    handoverConfirmedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
