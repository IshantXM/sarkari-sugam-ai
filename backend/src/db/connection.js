import mongoose from 'mongoose';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    let cleanUri = config.mongodbUri;
    // MongoDB engine rejects spaces in database namespaces: sanitize '%20' or ' ' to '-'
    if (cleanUri.includes('%20') || cleanUri.includes(' ')) {
      cleanUri = cleanUri.replace(/%20/g, '-').replace(/ /g, '-');
    }

    const conn = await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    logger.info(`[MONGODB] Connected successfully to database: "${conn.connection.name}" at ${conn.connection.host}:${conn.connection.port}`);
  } catch (err) {
    isConnected = false;
    logger.error(`[MONGODB] Connection error: ${err.message}. Operating with fallback mode.`);
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('[MONGODB] Disconnected from database.');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('[MONGODB] Reconnected to database.');
  });
}

export function getDBStatus() {
  const readyStates = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    connected: stateCode === 1,
    status: readyStates[stateCode] || 'Unknown',
    database: mongoose.connection.name || 'Sarkari Sugam-AI',
    host: mongoose.connection.host || 'localhost:27017',
    uri: config.mongodbUri.replace(/(:\/\/)(.*@)/, '$1***@'), // hide credentials if any
  };
}
