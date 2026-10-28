const cron = require('node-cron');
const Auction = require('../models/Auction');
const { createNotification } = require('../utils/notifications');

const startAuctionCloser = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const expiredAuctions = await Auction.find({
        status: 'ACTIVE',
        closesAt: { $lte: new Date() },
      });

      for (const auction of expiredAuctions) {
        const now = new Date();
        const nextStatus = auction.bidCount === 0 ? 'UNSOLD' : 'AWAITING_SELLER_DECISION';
        const closedAuction = await Auction.findOneAndUpdate(
          { _id: auction._id, status: 'ACTIVE', closesAt: { $lte: now } },
          { $set: { status: nextStatus }, $inc: { version: 1 } },
          { new: true }
        );
        if (!closedAuction) continue;

        if (nextStatus === 'UNSOLD') {
          console.log(`[Cron] Auction ${auction._id} marked UNSOLD`);

          createNotification(
            auction.sellerId,
            'AUCTION_CLOSED',
            `Your auction "${auction.title}" closed with no bids (UNSOLD).`,
            auction._id,
            io
          );
        } else {
          console.log(`[Cron] Auction ${auction._id} → AWAITING_SELLER_DECISION`);

          // Notify seller
          createNotification(
            auction.sellerId,
            'AUCTION_CLOSED',
            `Your auction "${auction.title}" has ended. Review the winning bid of ₹${(auction.currentBid / 100).toFixed(2)}.`,
            auction._id,
            io
          );

          // Notify winning bidder
          if (auction.leadingBidderId) {
            createNotification(
              auction.leadingBidderId,
              'AUCTION_WON',
              `You have the winning bid on "${auction.title}" (₹${(auction.currentBid / 100).toFixed(2)})! Waiting for seller approval.`,
              auction._id,
              io
            );
          }

          // Broadcast auction status change to room
          if (io) {
            io.to(`auction:${auction._id.toString()}`).emit('auction_status_changed', {
              auctionId: auction._id,
              status: 'AWAITING_SELLER_DECISION',
            });
          }
        }
      }
    } catch (err) {
      console.error('[Cron] Error closing auctions:', err.message);
    }
  });

  console.log('[Cron] Auction closer job started (every minute)');
};

module.exports = { startAuctionCloser };
