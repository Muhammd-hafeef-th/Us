import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * MongoDB connection configuration
 * Handles connection, reconnection, and error handling
 */

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'us-chat';

/**
 * Connect to MongoDB with proper error handling
 */
const connectDB = async () => {
  try {
    logger.info('Attempting to connect to MongoDB...', { uri: MONGODB_URI });

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Successfully connected to MongoDB', { database: DB_NAME });
  } catch (err) {
    logger.error('MongoDB connection error', {
      error: err.message,
      stack: err.stack
    });

    // Retry connection after delay
    logger.info('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * Event: MongoDB connected
 */
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB', { database: DB_NAME });
});

/**
 * Event: MongoDB connection error
 */
mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error', {
    error: err.message
  });
});

/**
 * Event: MongoDB disconnected
 */
mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected. Attempting to reconnect...');
  setTimeout(connectDB, 5000);
});

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (msg, callback) => {
  mongoose.connection.close(() => {
    logger.info('Mongoose connection closed', { reason: msg });
    callback();
  });
};

// Handle process termination
process.on('SIGINT', () => {
  gracefulShutdown('App termination (SIGINT)', () => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  gracefulShutdown('App termination (SIGTERM)', () => {
    process.exit(0);
  });
});

export default connectDB;
