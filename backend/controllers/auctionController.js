const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { createNotification } = require('../utils/notifications');
const { Mutex } = require('async-mutex');

// Per-auction mutex map to serialize concurrent bids
const auctionMutexes = new Map();
const getMutex = (auctionId) => {
  const key = auctionId.toString();
  if (!auctionMutexes.has(key)) auctionMutexes.set(key, new Mutex());
  return auctionMutexes.get(key);
};

const requestError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const getVersionFilter = (version) => (
  version === 0 || version === undefined
    ? { $or: [{ version: 0 }, { version: { $exists: false } }] }
    : { version }
);
const auctionPhotoUrl = (file) => (
  file.path
    ? file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`
    : file.secure_url || ''
);

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
  const now = new Date();
  if (now < auction.closesAt) return auction;

  const nextStatus = auction.bidCount === 0 ? 'UNSOLD' : 'AWAITING_SELLER_DECISION';
  const closedAuction = await Auction.findOneAndUpdate(
    { _id: auction._id, status: 'ACTIVE', closesAt: { $lte: now } },
    { $set: { status: nextStatus }, $inc: { version: 1 } },
    { new: true }
  );
  if (!closedAuction) {
    const currentAuction = await Auction.findById(auction._id);
    if (currentAuction && auction.populated('sellerId')) {
      await currentAuction.populate('sellerId', 'name department year contact');
      if (currentAuction.leadingBidderId) {
        await currentAuction.populate('leadingBidderId', 'name department');
      }
    }
    return currentAuction || auction;
  }
  auction.status = nextStatus;
  auction.version = closedAuction.version;
  if (nextStatus === 'AWAITING_SELLER_DECISION') {
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
    const now = new Date();
    if (auction.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Only open auctions can be edited.' });
    }
    if (auction.closesAt <= now) {
      return res.status(400).json({ message: 'This auction has already ended and cannot be edited.' });
    }

    const validBidExists = await Bid.exists({ auctionId: auction._id });
    const hasBids = auction.bidCount > 0 || !!validBidExists;
    const allowedFields = new Set([
      'descriptionAddition',
      'title',
      'category',
      'condition',
      'description',
      'startingPrice',
      'minIncrement',
      'closesAt',
      'handoverDetails',
      'existingPhotos',
      'photos',
    ]);
    const unknownField = Object.keys(req.body).find((field) => !allowedFields.has(field));
    if (unknownField) {
      return res.status(400).json({ message: `Field "${unknownField}" cannot be updated.` });
    }

    if (hasBids) {
      if (Object.keys(req.body).length !== 1 || req.body.descriptionAddition === undefined || req.files?.length) {
        return res.status(400).json({
          message: 'Core auction details are locked after the first bid. Submit only a description addition.',
        });
      }
      if (typeof req.body.descriptionAddition !== 'string') {
        return res.status(400).json({ message: 'Description addition must be text.' });
      }
      const text = req.body.descriptionAddition.trim();
      if (!text || text.length > 1000) {
        return res.status(400).json({ message: 'Description addition must contain 1 to 1000 characters.' });
      }

      const updatedAuction = await Auction.findOneAndUpdate(
        {
          _id: auction._id,
          sellerId: req.user._id,
          status: 'ACTIVE',
          closesAt: { $gt: now },
          ...getVersionFilter(auction.version),
        },
        { $push: { descriptionAdditions: { text, createdAt: now } }, $inc: { version: 1 } },
        { new: true, runValidators: true }
      );
      if (!updatedAuction) {
        return res.status(409).json({ message: 'Auction changed while you were editing. Refresh and try again.' });
      }
      return res.json({ auction: updatedAuction });
    }

    if (req.body.descriptionAddition !== undefined) {
      return res.status(400).json({ message: 'Use the original description field before the first bid.' });
    }

    const updates = {};
    for (const field of ['title', 'description', 'handoverDetails']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ message: `${field} must be text.` });
        }
        updates[field] = req.body[field].trim();
      }
    }
    if (updates.title !== undefined && (updates.title.length < 3 || updates.title.length > 120)) {
      return res.status(400).json({ message: 'Title must contain 3 to 120 characters.' });
    }
    if (updates.description !== undefined && (!updates.description || updates.description.length > 5000)) {
      return res.status(400).json({ message: 'Description must contain 1 to 5000 characters.' });
    }
    if (updates.handoverDetails !== undefined && updates.handoverDetails.length > 500) {
      return res.status(400).json({ message: 'Handover details cannot exceed 500 characters.' });
    }
    for (const field of ['category', 'condition']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    for (const field of ['startingPrice', 'minIncrement']) {
      if (req.body[field] !== undefined) {
        const amount = Number(req.body[field]);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ message: `${field} must be a positive amount.` });
        }
        updates[field] = Math.round(amount * 100);
      }
    }
    if (req.body.closesAt !== undefined) {
      const closesAt = new Date(req.body.closesAt);
      if (Number.isNaN(closesAt.getTime()) || closesAt <= now) {
        return res.status(400).json({ message: 'Closing date must be in the future.' });
      }
      updates.closesAt = closesAt;
    }
    const incomingFiles = (req.files || []).map(auctionPhotoUrl).filter(Boolean);
    let photoSelection = req.body.existingPhotos ?? req.body.photos;
    if (typeof photoSelection === 'string') {
      try {
        photoSelection = JSON.parse(photoSelection);
      } catch {
        return res.status(400).json({ message: 'Photo selection must be a valid list.' });
      }
    }
    if (photoSelection !== undefined && !Array.isArray(photoSelection)) {
      return res.status(400).json({ message: 'Photo selection must be a list.' });
    }
    if (photoSelection !== undefined || incomingFiles.length) {
      const retainedPhotos = photoSelection === undefined ? auction.photos : photoSelection;
      if (
        retainedPhotos.some((photo) => typeof photo !== 'string' || !auction.photos.includes(photo)) ||
        new Set(retainedPhotos).size !== retainedPhotos.length
      ) {
        return res.status(400).json({ message: 'Only existing auction photos can be retained.' });
      }
      updates.photos = [...retainedPhotos, ...incomingFiles];
      if (updates.photos.length > 5) {
        return res.status(400).json({ message: 'An auction can have at most 5 photos.' });
      }
    }
    if (
      updates.title === '' ||
      updates.description === '' ||
      (updates.title === undefined && !auction.title) ||
      (updates.description === undefined && !auction.description)
    ) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const updatedAuction = await Auction.findOneAndUpdate(
      {
        _id: auction._id,
        sellerId: req.user._id,
        status: 'ACTIVE',
        bidCount: 0,
        closesAt: { $gt: now },
        ...getVersionFilter(auction.version),
      },
      { $set: updates, $inc: { version: 1 } },
      { new: true, runValidators: true }
    );
    if (!updatedAuction) {
      return res.status(409).json({ message: 'A bid or another update arrived first. Refresh before editing.' });
    }
    res.json({ auction: updatedAuction });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(err.statusCode || 500).json({ message: err.message });
  } finally {
    release();
  }
};

// POST /api/auctions/:id/cancel
const cancelAuction = async (req, res) => {
  const mutex = getMutex(req.params.id);
  const release = await mutex.acquire();
  const session = await mongoose.startSession();
  try {
    const unexpectedField = Object.keys(req.body || {}).find((field) => field !== 'reason');
    if (unexpectedField) {
      return res.status(400).json({ message: `Field "${unexpectedField}" cannot be supplied when cancelling.` });
    }
    const reasonInput = req.body?.reason;
    if (reasonInput !== undefined && typeof reasonInput !== 'string') {
      return res.status(400).json({ message: 'Cancellation reason must be text.' });
    }
    const reason = typeof reasonInput === 'string' ? reasonInput.trim() : '';
    if (reason.length > 1000) {
      return res.status(400).json({ message: 'Cancellation reason cannot exceed 1000 characters.' });
    }

    const cancellationId = new mongoose.Types.ObjectId();
    let cancelledAuction;
    let notifiedUsers = [];
    await session.withTransaction(async () => {
      const auction = await Auction.findById(req.params.id).session(session);
      if (!auction) throw requestError(404, 'Auction not found.');
      if (auction.sellerId.toString() !== req.user._id.toString()) {
        throw requestError(403, 'Not your auction.');
      }
      if (auction.status !== 'ACTIVE') {
        const hint = auction.status === 'AWAITING_SELLER_DECISION'
          ? ' Use the existing Reject flow if you do not want to proceed with the winning bid.'
          : '';
        throw requestError(400, `This auction has ended and cannot be cancelled.${hint}`);
      }

      const now = new Date();
      if (auction.closesAt <= now) {
        throw requestError(
          400,
          'This auction has ended. Cancellation is unavailable; use the existing Reject flow if it is awaiting your decision.'
        );
      }
      const bidderIds = await Bid.find({ auctionId: auction._id })
        .distinct('bidderId')
        .session(session);
      const hasBids = auction.bidCount > 0 || bidderIds.length > 0;
      if (hasBids && !reason) {
        throw requestError(400, 'A cancellation reason is required after the first bid.');
      }

      const updated = await Auction.findOneAndUpdate(
        {
          _id: auction._id,
          sellerId: req.user._id,
          status: 'ACTIVE',
          closesAt: { $gt: now },
          bidCount: auction.bidCount,
          ...getVersionFilter(auction.version),
        },
        {
          $set: {
            status: 'CANCELLED',
            cancellation: {
              cancellationId,
              cancelledBy: req.user._id,
              reason,
              cancelledAt: now,
            },
          },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true, session }
      );
      if (!updated) {
        throw requestError(409, 'A bid or another auction update arrived first. Refresh and try again.');
      }

      notifiedUsers = bidderIds.map((id) => id.toString());
      const message = `The seller cancelled "${auction.title}". Reason: ${reason}`;
      if (bidderIds.length) {
        await Notification.bulkWrite(
          bidderIds.map((userId) => ({
            updateOne: {
              filter: { userId, cancellationId },
              update: {
                $setOnInsert: {
                  userId,
                  type: 'AUCTION_CANCELLED',
                  message,
                  auctionId: auction._id,
                  cancellationId,
                  isRead: false,
                },
              },
              upsert: true,
            },
          })),
          { session }
        );
      }
      cancelledAuction = updated;
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${cancelledAuction._id.toString()}`).emit('auction_status_changed', {
        status: 'CANCELLED',
        cancellation: cancelledAuction.cancellation,
      });
      const notifications = await Notification.find({ cancellationId }).lean();
      notifications.forEach((notification) => {
        io.to(`user:${notification.userId.toString()}`).emit('notification', notification);
      });
    }

    res.json({ auction: cancelledAuction, notifiedBidderCount: notifiedUsers.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  } finally {
    await session.endSession();
    release();
  }
};

// POST /api/auctions/:id/bids  (CRITICAL — atomic)
const placeBid = async (req, res) => {
  const mutex = getMutex(req.params.id);
  const release = await mutex.acquire();
  const session = await mongoose.startSession();
  try {
    const io = req.app.get('io');
    const amountINR = Number(req.body.amount);
    if (!Number.isFinite(amountINR) || amountINR <= 0) {
      return res.status(400).json({ message: 'Invalid bid amount.' });
    }
    const amountPaise = Math.round(amountINR * 100);
    let auction;
    let bid;
    let previousLeader;
    await session.withTransaction(async () => {
      auction = await Auction.findById(req.params.id).session(session);
      if (!auction) throw requestError(404, 'Auction not found.');
      if (auction.status !== 'ACTIVE') {
        throw requestError(400, 'This auction is not open for bidding.');
      }
      const now = new Date();
      if (now >= auction.closesAt) {
        throw requestError(400, 'Auction has already closed.');
      }
      if (auction.sellerId.toString() === req.user._id.toString()) {
        throw requestError(403, 'You cannot bid on your own listing.');
      }
      const minimumBid = auction.bidCount === 0
        ? auction.startingPrice
        : auction.currentBid + auction.minIncrement;
      if (amountPaise < minimumBid) {
        throw requestError(
          400,
          auction.bidCount === 0
            ? `First bid must be at least ₹${(minimumBid / 100).toFixed(2)}.`
            : `Bid must be at least ₹${(minimumBid / 100).toFixed(2)}.`
        );
      }

      previousLeader = auction.leadingBidderId;
      const sequenceNumber = auction.bidCount + 1;
      const updatedAuction = await Auction.findOneAndUpdate(
        {
          _id: auction._id,
          status: 'ACTIVE',
          closesAt: { $gt: now },
          bidCount: auction.bidCount,
          ...getVersionFilter(auction.version),
        },
        {
          $set: { currentBid: amountPaise, leadingBidderId: req.user._id },
          $inc: { bidCount: 1, version: 1 },
        },
        { new: true, session }
      );
      if (!updatedAuction) {
        throw requestError(409, 'Auction changed before your bid was placed. Refresh and try again.');
      }
      [bid] = await Bid.create([{
        auctionId: auction._id,
        bidderId: req.user._id,
        amount: amountPaise,
        sequenceNumber,
      }], { session });
      auction = updatedAuction;
    });

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
    if (err.statusCode === 400 && err.message === 'Auction has already closed.') {
      const expiredAuction = await Auction.findById(req.params.id);
      if (expiredAuction) await checkAndCloseAuction(expiredAuction, req.app.get('io'));
    }
    res.status(err.statusCode || (err.name === 'ValidationError' ? 400 : 500)).json({ message: err.message });
  } finally {
    await session.endSession();
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
