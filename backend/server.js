const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const { startAuctionCloser } = require('./jobs/auctionCloser');

// Routes
const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const myRoutes = require('./routes/my');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (!req[key]) return;

    const sanitized = mongoSanitize.sanitize(req[key]);
    if (key === 'query') {
      Object.defineProperty(req, 'query', {
        configurable: true,
        enumerable: true,
        value: sanitized,
      });
    } else {
      req[key] = sanitized;
    }
  });
  next();
});

// Serve uploaded files (local fallback)
app.use('/uploads', express.static(path.join(__dirname, '../frontend/public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/my', myRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join personal room for notifications
  socket.on('join_user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket] User ${userId} joined personal room`);
  });

  // Join auction room for live bids
  socket.on('join_auction', (auctionId) => {
    socket.join(`auction:${auctionId}`);
    console.log(`[Socket] Socket ${socket.id} joined auction:${auctionId}`);
  });

  socket.on('leave_auction', (auctionId) => {
    socket.leave(`auction:${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Connect DB and start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  startAuctionCloser(io);
  server.listen(PORT, () => {
    console.log(`[Server] CampusBid backend running on http://localhost:${PORT}`);
  });
});
