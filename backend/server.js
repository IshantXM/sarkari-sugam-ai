import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/env.js';
import logger from './utils/logger.js';
import healthRouter from './routes/health.js';
import tendersRouter from './routes/tenders.js';
import authRouter from './src/routes/auth.js';
import databaseRouter from './src/routes/database.js';
import { connectDB } from './src/db/connection.js';
import { authenticateToken } from './src/middleware/auth.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security: Helmet HTTP headers (configured for cross-origin API clients)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Security: Dynamic Robust CORS
const rawOrigins = (config.corsOrigin || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');
      const isAllowed =
        config.corsOrigin === '*' ||
        rawOrigins.some((ro) => ro.replace(/\/+$/, '') === cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin.includes('localhost') ||
        cleanOrigin.includes('127.0.0.1');

      if (isAllowed) {
        // Echo back the exact incoming origin to satisfy browser strict origin equality
        return callback(null, origin);
      }

      logger.warn(`[CORS] Rejected request from unauthorized origin: ${origin}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

// Security: Rate limiting (60 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      error: 'rate_limit_exceeded',
      message: 'Too many requests, please try again in 60 seconds.',
      request_id: req.id || 'req_unknown',
      timestamp: new Date().toISOString(),
    });
  },
});
app.use(limiter);

// Security: JSON body size limit (10mb to accommodate scanned image base64 payloads)
app.use(express.json({ limit: '10mb' }));

// Request ID and Request Logging Middleware
app.use((req, res, next) => {
  req.id = 'req_' + Math.random().toString(36).substring(2, 10);
  res.setHeader('X-Request-Id', req.id);
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    logger.request({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      requestId: req.id,
    });
  });

  next();
});

// Route Mounting
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/database', authenticateToken, databaseRouter);
app.use('/api/tenders', authenticateToken, tendersRouter);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Central Error Handler (never leaks secrets or stack traces)
app.use(errorHandler);

import Tender from './src/models/Tender.js';

// Connect to MongoDB/PostgreSQL and start server
async function startServer() {
  await connectDB();

  const port = config.port || 5005;

  server = app.listen(port, () => {
    logger.info(`=======================================================`);
    logger.info(`Sarkari Sugam AI Backend running on port ${port}`);
    logger.info(`Database: ${config.databaseType.toUpperCase()} (${config.databaseType === 'postgresql' ? 'Supabase' : 'MongoDB'})`);
    logger.info(`TinyFish Status: ${config.tinyfish.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    logger.info(
      `Portal Auth Status: ${config.portal.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`
    );
    logger.info(`Alert Delivery: ${config.isSlackConfigured ? 'SLACK LIVE' : 'LOGGED'}`);
    logger.info(`=======================================================`);

    // Autonomous Background Watchdog Daemon (Periodic Heartbeat every 5 minutes)
    const WATCHDOG_INTERVAL_MS = 5 * 60 * 1000;
    setInterval(async () => {
      try {
        const activeTenders = await Tender.find().limit(25);
        const mutations = activeTenders.filter((t) => (t.status || '').includes('MUTATION')).length;
        logger.info(
          `[WATCHDOG:DAEMON] Background watchdog heartbeat: ${activeTenders.length} contracts monitored, ${mutations} corrigendums active.`
        );
      } catch (err) {
        logger.warn(`[WATCHDOG:DAEMON] Heartbeat skipped: ${err.message}`);
      }
    }, WATCHDOG_INTERVAL_MS).unref();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`[SYSTEM] Port ${port} is already in use by another process.`);
      process.exit(1);
    } else {
      logger.error(`[SYSTEM] Server runtime error:`, err);
    }
  });
}

let server;
startServer();

// Nodemon graceful reload
process.once('SIGUSR2', () => {
  if (server && server.listening) {
    server.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  } else {
    process.kill(process.pid, 'SIGUSR2');
  }
});

// Graceful Shutdown on SIGINT and SIGTERM
let isShuttingDown = false;
function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`[SYSTEM] Received ${signal}. Initiating graceful shutdown...`);
  if (server && server.listening) {
    server.close(() => {
      logger.info('[SYSTEM] HTTP server connections closed. Process terminating safely.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force termination if hanging after 3 seconds
  setTimeout(() => {
    process.exit(0);
  }, 3000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
