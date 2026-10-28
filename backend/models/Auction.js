const mongoose = require('mongoose');

const AUCTION_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'BIDDING_CLOSED',
  'UNSOLD',
  'AWAITING_SELLER_DECISION',
  'RESERVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
  'PICKUP_FAILED',
];

const auctionSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Books',
        'Electronics',
        'Clothing',
        'Furniture',
        'Sports',
        'Stationery',
        'Vehicles',
        'Appliances',
        'Other',
      ],
    },
    description: { type: String, required: true },
    condition: {
      type: String,
      required: true,
      enum: ['New-like', 'Good', 'Fair', 'Poor'],
    },
    photos: [{ type: String }], // URLs
    // Store amounts in integer paise (1 INR = 100 paise)
    startingPrice: { type: Number, required: true, min: 1 }, // paise
    minIncrement: { type: Number, required: true, min: 1 }, // paise
    currentBid: { type: Number, default: 0 }, // paise; 0 = no bids yet
    leadingBidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bidCount: { type: Number, default: 0 },
    closesAt: { type: Date, required: true },
    status: {
      type: String,
      enum: AUCTION_STATUSES,
      default: 'ACTIVE',
    },
    handoverDetails: { type: String, default: '' },
    // For optimistic concurrency on bids
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
auctionSchema.index({ status: 1, closesAt: 1 });
auctionSchema.index({ category: 1, condition: 1 });
auctionSchema.index({ title: 'text', description: 'text' });
auctionSchema.index({ sellerId: 1 });

module.exports = mongoose.model('Auction', auctionSchema);
