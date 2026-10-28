const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Transaction = require('../models/Transaction');
const { createNotification } = require('../utils/notifications');
const { Mutex } = require('async-mutex');

// Per-auction mutex map to serialize concurrent bids
const auctionMutexes = new Map();
const getMutex = (auctionId) => {
  const key = auctionId.toString();
  if (!auctionMutexes.has(key)) auctionMutexes.set(key, new Mutex());
  return auctionMutexes.get(key);
};

// GET /api/auctions
const getAuctions = async (req, res) => {
  try {
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      status,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    // Keep the default active-only behavior for existing API clients.
    if (status === 'ALL') {
      query.status = {
        $in: [
          'ACTIVE',
          'BIDDING_CLOSED',
          'UNSOLD',
          'AWAITING_SELLER_DECISION',
          'RESERVED',
          'REJECTED',
          'COMPLETED',
          'CANCELLED',
          'PICKUP_FAILED',
        ],
      };
    } else if (status === 'ENDED') {
      query.status = {
        $in: [
          'BIDDING_CLOSED',
          'UNSOLD',
          'AWAITING_SELLER_DECISION',
          'REJECTED',
          'CANCELLED',
          'PICKUP_FAILED',
        ],
      };
    } else if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['ACTIVE'] };
    }

    if (search) {
      query.$text = { $search: search };
    }
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.currentBid = {};
      if (minPrice) query.currentBid.$gte = Number(minPrice) * 100; // convert to paise
      if (maxPrice) query.currentBid.$lte = Number(maxPrice) * 100;
    }

    let sortOption = {};
    switch (sort) {
      case 'closing_soon':
        sortOption = { closesAt: 1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'lowest_bid':
        sortOption = { currentBid: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('sellerId', 'name department year')
        .populate('leadingBidderId', 'name')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      Auction.countDocuments(query),
    ]);

    res.json({
      auctions,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auctions
const createAuction = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      condition,
      startingPrice,
      minIncrement,
      closesAt,
      handoverDetails,
    } = req.body;

    if (!title || !category || !description || !condition || !startingPrice || !minIncrement || !closesAt) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const closingDate = new Date(closesAt);
    if (closingDate <= new Date()) {
      return res.status(400).json({ message: 'Closing date must be in the future.' });
    }

    // Convert INR to paise
    const startingPricePaise = Math.round(Number(startingPrice) * 100);
    const minIncrementPaise = Math.round(Number(minIncrement) * 100);

    const photos = req.files
      ? req.files.map((f) =>
          f.path
            ? // cloudinary gives .path; local disk gives absolute path, convert to URL
              f.path.startsWith('http')
              ? f.path
              : `/uploads/${f.filename}`
            : f.secure_url || ''
        )
      : [];

    const auction = await Auction.create({
      sellerId: req.user._id,
      title,
      category,
      description,
      condition,
      photos,
      startingPrice: startingPricePaise,
      minIncrement: minIncrementPaise,
      closesAt: closingDate,
      handoverDetails: handoverDetails || '',
    });

    res.status(201).json({ auction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper: check and close expired auction
const checkAndCloseAuction = async (auction, io) => {
  if (auction.status !== 'ACTIVE') return auction;
  if (new Date() < auction.closesAt) return auction;

  if (auction.bidCount === 0) {
    auction.status = 'UNSOLD';
  } else {
    auction.status = 'AWAITING_SELLER_DECISION';
    // Notify seller
    if (io) {
      createNotification(
        auction.sellerId,
        'AUCTION_CLOSED',
        `Your auction "${auction.title}" has closed. Review the winning bid.`,
        auction._id,
        io
      );
      if (auction.leadingBidderId) {
        createNotification(
          auction.leadingBidderId,
          'AUCTION_WON',
          `You have the winning bid on "${auction.title}"! Waiting for seller approval.`,
          auction._id,
          io
        );
      }
    }
  }
  await auction.save();
  return auction;
};

// GET /api/auctions/:id
const getAuction = async (req, res) => {
  try {
    let auction = await Auction.findById(req.params.id)
      .populate('sellerId', 'name department year contact')
      .populate('leadingBidderId', 'name department');

    if (!auction) return res.status(404).json({ message: 'Auction not found.' });

    // Check expiry on access
    const io = req.app.get('io');
    auction = await checkAndCloseAuction(auction, io);

    res.json({ auction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/auctions/:id
const updateAuction = async (req, res) => {
  const mutex = getMutex(req.params.id);
  const release = await mutex.acquire();
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found.' });
    if (auction.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your auction.' });
    }
    if (auction.status !== 'ACTIVE' || auction.bidCount > 0) {
      return res.status(400).json({ message: 'Cannot edit an auction that has bids.' });
    }
    if (auction.closesAt <= new Date()) {
      return res.status(400).json({ message: 'Cannot edit an auction that has already closed.' });
    }

    const textFields = ['title', 'description', 'handoverDetails'];
    for (const field of textFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ message: `${field} must be text.` });
        }
        auction[field] = req.body[field].trim();
      }
    }

    ['category', 'condition'].forEach((field) => {
      if (req.body[field] !== undefined) auction[field] = req.body[field];
    });

    for (const field of ['startingPrice', 'minIncrement']) {
      if (req.body[field] !== undefined) {
        const amount = Number(req.body[field]);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ message: `${field} must be a positive amount.` });
        }
        auction[field] = Math.round(amount * 100);
      }
    }

    if (req.body.closesAt !== undefined) {
      const closesAt = new Date(req.body.closesAt);
      if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date()) {
        return res.status(400).json({ message: 'Closing date must be in the future.' });
      }
      auction.closesAt = closesAt;
    }

    if (!auction.title || !auction.description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    await auction.save();
    res.json({ auction });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  } finally {
    release();
  }
};

// POST /api/auctions/:id/cancel
const cancelAuction = async (req, res) => {
  const mutex = getMutex(req.params.id);
  const release = await mutex.acquire();
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found.' });
    if (auction.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your auction.' });
    }
    if (auction.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Only active auctions can be cancelled.' });
    }
    if (auction.bidCount > 0) {
      return res.status(400).json({ message: 'Cannot cancel an auction after it has received bids.' });
    }
    if (auction.closesAt <= new Date()) {
      return res.status(400).json({ message: 'Cannot cancel an auction that has already closed.' });
    }

    auction.status = 'CANCELLED';
    await auction.save();

    req.app.get('io')?.to(`auction:${auction._id.toString()}`).emit('auction_status_changed', {
      status: auction.status,
    });

    res.json({ auction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    release();
  }
};

// POST /api/auctions/:id/bids  (CRITICAL — atomic)
const placeBid = async (req, res) => {
  const mutex = getMutex(req.params.id);
  const release = await mutex.acquire();
  try {
    const io = req.app.get('io');
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found.' });

    // Check status & time — server authoritative
    if (auction.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'This auction is not open for bidding.' });
    }
    if (new Date() >= auction.closesAt) {
      // Close it now
      await checkAndCloseAuction(auction, io);
      return res.status(400).json({ message: 'Auction has already closed.' });
    }

    // Self-bid prevention
    if (auction.sellerId.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot bid on your own listing.' });
    }

    const amountINR = Number(req.body.amount);
    if (!amountINR || isNaN(amountINR)) {
      return res.status(400).json({ message: 'Invalid bid amount.' });
    }
    const amountPaise = Math.round(amountINR * 100);

    // Validate amount
    if (auction.bidCount === 0) {
      // First bid: must be >= startingPrice
      if (amountPaise < auction.startingPrice) {
        return res.status(400).json({
          message: `First bid must be at least ₹${(auction.startingPrice / 100).toFixed(2)}.`,
        });
      }
    } else {
      // Subsequent: must be >= currentBid + minIncrement
      const minRequired = auction.currentBid + auction.minIncrement;
      if (amountPaise < minRequired) {
        return res.status(400).json({
          message: `Bid must be at least ₹${(minRequired / 100).toFixed(2)}.`,
        });
      }
    }

    const previousLeader = auction.leadingBidderId;
    const sequenceNumber = auction.bidCount + 1;

    // Create bid record
    const bid = await Bid.create({
      auctionId: auction._id,
      bidderId: req.user._id,
      amount: amountPaise,
      sequenceNumber,
    });

    // Update auction
    auction.currentBid = amountPaise;
    auction.leadingBidderId = req.user._id;
    auction.bidCount = sequenceNumber;
    auction.version += 1;
    await auction.save();

    // Populate for response
    const populatedBid = await Bid.findById(bid._id).populate('bidderId', 'name department');

    // Emit to auction room
    if (io) {
      io.to(`auction:${auction._id.toString()}`).emit('new_bid', {
        bid: populatedBid,
        currentBid: amountPaise,
        leadingBidder: { _id: req.user._id, name: req.user.name },
        nextMinBid: amountPaise + auction.minIncrement,
      });

      // Notify previous leader of outbid
      if (previousLeader && previousLeader.toString() !== req.user._id.toString()) {
        createNotification(
          previousLeader,
          'OUTBID',
          `You've been outbid on "${auction.title}". Current bid: ₹${(amountPaise / 100).toFixed(2)}.`,
          auction._id,
          io
        );
      }

      // Notify seller of new bid
      createNotification(
        auction.sellerId,
        'NEW_BID_ON_YOUR_ITEM',
        `New bid of ₹${(amountPaise / 100).toFixed(2)} placed on "${auction.title}".`,
        auction._id,
        io
      );
    }

    res.status(201).json({
      bid: populatedBid,
      currentBid: amountPaise,
      nextMinBid: amountPaise + auction.minIncrement,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    release();
  }
};

// GET /api/auctions/:id/bids
const getBids = async (req, res) => {
  try {
    const bids = await Bid.find({ auctionId: req.params.id })
      .populate('bidderId', 'name department')
      .sort({ sequenceNumber: 1 });
    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auctions/:id/decision
const sellerDecision = async (req, res) => {
  try {
    const { decision } = req.body; // 'APPROVED' or 'REJECTED'
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be APPROVED or REJECTED.' });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found.' });
    if (auction.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your auction.' });
    }
    if (auction.status !== 'AWAITING_SELLER_DECISION') {
      return res.status(400).json({ message: 'Auction is not awaiting a decision.' });
    }

    const io = req.app.get('io');

    if (decision === 'APPROVED') {
      auction.status = 'RESERVED';
      const pickupDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await Transaction.create({
        auctionId: auction._id,
        sellerId: auction.sellerId,
        winnerId: auction.leadingBidderId,
        winningBid: auction.currentBid,
        sellerDecision: 'APPROVED',
        pickupDeadline,
      });

      createNotification(
        auction.leadingBidderId,
        'BID_APPROVED',
        `Your bid on "${auction.title}" was approved! Contact the seller to arrange campus handover. Deadline: ${pickupDeadline.toLocaleDateString()}.`,
        auction._id,
        io
      );
    } else {
      auction.status = 'REJECTED';
      await Transaction.create({
        auctionId: auction._id,
        sellerId: auction.sellerId,
        winnerId: auction.leadingBidderId,
        winningBid: auction.currentBid,
        sellerDecision: 'REJECTED',
      });

      createNotification(
        auction.leadingBidderId,
        'BID_REJECTED',
        `Sorry, your bid on "${auction.title}" was rejected by the seller.`,
        auction._id,
        io
      );
    }

    await auction.save();
    res.json({ auction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/my/listings
const getMyListings = async (req, res) => {
  try {
    const auctions = await Auction.find({ sellerId: req.user._id })
      .populate('leadingBidderId', 'name department contact')
      .sort({ createdAt: -1 });
    res.json({ auctions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/my/bids
const getMyBids = async (req, res) => {
  try {
    // Get distinct auction IDs this user has bid on
    const bidRecords = await Bid.find({ bidderId: req.user._id }).distinct('auctionId');
    const auctions = await Auction.find({ _id: { $in: bidRecords } })
      .populate('sellerId', 'name department')
      .populate('leadingBidderId', 'name')
      .sort({ closesAt: 1 });

    // Attach user's highest bid per auction
    const result = await Promise.all(
      auctions.map(async (auction) => {
        const topBid = await Bid.findOne({
          auctionId: auction._id,
          bidderId: req.user._id,
        }).sort({ amount: -1 });
        return { auction, myHighestBid: topBid ? topBid.amount : 0 };
      })
    );

    res.json({ auctions: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAuctions,
  createAuction,
  getAuction,
  updateAuction,
  cancelAuction,
  placeBid,
  getBids,
  sellerDecision,
  getMyListings,
  getMyBids,
  checkAndCloseAuction,
};
