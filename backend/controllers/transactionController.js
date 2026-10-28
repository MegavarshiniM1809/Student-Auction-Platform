const Transaction = require('../models/Transaction');
const Auction = require('../models/Auction');
const { createNotification } = require('../utils/notifications');

// POST /api/transactions/:id/cancel
const cancelTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate('auctionId');
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });

    if (tx.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (tx.finalOutcome) {
      return res.status(400).json({ message: 'Transaction already finalized.' });
    }

    tx.finalOutcome = 'CANCELLED';
    tx.completedAt = new Date();
    tx.notes = req.body.notes || '';
    await tx.save();

    await Auction.findByIdAndUpdate(tx.auctionId, { status: 'CANCELLED' });

    const io = req.app.get('io');
    createNotification(
      tx.winnerId,
      'AUCTION_CANCELLED',
      `The seller cancelled the transaction for "${tx.auctionId.title}".`,
      tx.auctionId._id,
      io
    );

    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/transactions/:id/handover
const confirmHandover = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate('auctionId');
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });

    const isParty =
      tx.sellerId.toString() === req.user._id.toString() ||
      tx.winnerId.toString() === req.user._id.toString();
    if (!isParty) return res.status(403).json({ message: 'Not authorized.' });

    const userId = req.user._id;
    if (!tx.handoverConfirmedBy.map((id) => id.toString()).includes(userId.toString())) {
      tx.handoverConfirmedBy.push(userId);
    }

    // Complete when both seller and winner confirm
    const bothConfirmed =
      tx.handoverConfirmedBy.map((id) => id.toString()).includes(tx.sellerId.toString()) &&
      tx.handoverConfirmedBy.map((id) => id.toString()).includes(tx.winnerId.toString());

    if (bothConfirmed) {
      tx.finalOutcome = 'COMPLETED';
      tx.completedAt = new Date();
      await Auction.findByIdAndUpdate(tx.auctionId, { status: 'COMPLETED' });

      const io = req.app.get('io');
      createNotification(
        tx.sellerId,
        'HANDOVER_CONFIRMED',
        `Handover completed for "${tx.auctionId.title}".`,
        tx.auctionId._id,
        io
      );
      createNotification(
        tx.winnerId,
        'HANDOVER_CONFIRMED',
        `You confirmed receiving "${tx.auctionId.title}". Transaction complete!`,
        tx.auctionId._id,
        io
      );
    }

    await tx.save();
    res.json({ transaction: tx, bothConfirmed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/transactions/:id/pickup-failed
const pickupFailed = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate('auctionId');
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });
    if (tx.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only seller can report pickup failure.' });
    }
    if (tx.finalOutcome) {
      return res.status(400).json({ message: 'Transaction already finalized.' });
    }

    tx.finalOutcome = 'PICKUP_FAILED';
    tx.completedAt = new Date();
    tx.notes = req.body.notes || '';
    await tx.save();

    await Auction.findByIdAndUpdate(tx.auctionId, { status: 'PICKUP_FAILED' });

    const io = req.app.get('io');
    createNotification(
      tx.winnerId,
      'PICKUP_FAILED',
      `Pickup was recorded as failed for "${tx.auctionId.title}".`,
      tx.auctionId._id,
      io
    );

    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/transactions/my
const getMyTransactions = async (req, res) => {
  try {
    const txs = await Transaction.find({
      $or: [{ sellerId: req.user._id }, { winnerId: req.user._id }],
    })
      .populate('auctionId', 'title photos status')
      .populate('sellerId', 'name contact')
      .populate('winnerId', 'name contact')
      .sort({ createdAt: -1 });
    res.json({ transactions: txs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { cancelTransaction, confirmHandover, pickupFailed, getMyTransactions };
