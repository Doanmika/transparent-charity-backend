require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const initBlockchainListener = require('./services/blockchainListener');

const campaignRoutes = require('./routes/campaignRoutes');
const donationRoutes = require('./routes/donationRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://localhost:5173'
    : true,
  credentials: true,
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 100 : 1000,
  message: { success: false, message: 'Qua nhieu yeu cau, vui long thu lai sau' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(limiter);

// Request logging (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/distributions', distributionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check with DB connection check
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : dbState === 3 ? 'disconnecting' : 'disconnected';
  
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    message: dbState === 1 
      ? 'Backend He thong Quyen gop Tu thien dang hoat dong' 
      : 'Database chua ket noi',
    time: new Date(),
    database: dbStatus,
    uptime: process.uptime(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false, 
      message: Object.values(err.errors).map(e => e.message).join(', ') 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      success: false, 
      message: 'Du lieu da ton tai (duplicate key)' 
    });
  }
  
  res.status(500).json({ 
    success: false, 
    message: NODE_ENV === 'production' 
      ? 'Loi server noi bo' 
      : err.message 
  });
});

// Ket noi MongoDB
connectDB();

// Khoi chay server
const server = app.listen(PORT, () => {
  console.log(`[Server] Dang chay tren cong http://localhost:${PORT} (${NODE_ENV})`);
  // Khoi dong lang nghe blockchain
  initBlockchainListener();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Dang dong server...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('[Server] Server da dong.');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('[Server] Dang dong server...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('[Server] Server da dong.');
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message || err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message || err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message || err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message || err);
  process.exit(1);
});
