import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import chatRoutes from './routes/chatRoutes.js';
import chatSocket from './sockets/chatSocket.js';
import logger from './utils/logger.js';
import { CONNECTION_CONFIG } from './utils/constants.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 5005;

// Initialize Express app
const app = express();
const server = http.createServer(app);

/**
 * Socket.IO Configuration
 */
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: CONNECTION_CONFIG.PING_TIMEOUT,
  pingInterval: CONNECTION_CONFIG.PING_INTERVAL,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

/**
 * Middleware Configuration
 */
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

/**
 * Database Connection
 */
connectDB();

/**
 * Routes
 */
app.use('/', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message
  });
});

/**
 * Socket.IO Handler
 */
chatSocket(io);

/**
 * Graceful Shutdown
 */
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Start Server
 */
server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    clientUrl: CLIENT_URL
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });

  // Exit process after logging
  process.exit(1);
});

export default app;
