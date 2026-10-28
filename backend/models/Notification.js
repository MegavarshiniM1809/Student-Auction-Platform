const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'OUTBID',
        'AUCTION_CLOSED',
        'AUCTION_WON',
        'BID_APPROVED',
        'BID_REJECTED',
        'ITEM_RESERVED',
        'HANDOVER_CONFIRMED',
        'PICKUP_FAILED',
        'AUCTION_CANCELLED',
        'NEW_BID_ON_YOUR_ITEM',
        'GENERAL',
      ],
    },
    message: { type: String, required: true },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null,
    },
    cancellationId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, cancellationId: 1 },
  { unique: true, partialFilterExpression: { cancellationId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Notification', notificationSchema);
