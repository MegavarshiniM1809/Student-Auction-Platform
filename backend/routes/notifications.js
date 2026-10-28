const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, markAllRead);
router.patch('/:id/read', protect, markRead);

module.exports = router;
