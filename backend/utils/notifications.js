const Notification = require('../models/Notification');

/**
 * Create a notification and optionally emit via Socket.IO.
 */
const createNotification = async (
  userId,
  type,
  message,
  auctionId = null,
  io = null
) => {
  try {
    const notif = await Notification.create({ userId, type, message, auctionId });
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification', {
        _id: notif._id,
        type,
        message,
        auctionId,
        isRead: false,
        createdAt: notif.createdAt,
      });
    }
    return notif;
  } catch (err) {
    console.error('Error creating notification:', err.message);
  }
};

module.exports = { createNotification };
