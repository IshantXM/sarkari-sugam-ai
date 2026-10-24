import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/env.js';
import logger from './utils/logger.js';
import healthRouter from './routes/health.js';
import tendersRouter from './routes/tenders.js';
import authRouter, { seedDemoAccounts } from './src/routes/auth.js';
import databaseRouter from './src/routes/database.js';
import { connectDB } from './src/db/connection.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security: Helmet HTTP headers
app.use(helmet());

// Security: Restricted CORS
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
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

// Security: JSON body size limit (100kb max)
app.use(express.json({ limit: '100kb' }));

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
app.use('/api/database', databaseRouter);
app.use('/api/tenders', tendersRouter);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Central Error Handler (never leaks secrets or stack traces)
app.use(errorHandler);

import Tender from './src/models/Tender.js';

// Connect to MongoDB/PostgreSQL and start server
async function startServer() {
  await connectDB();
  await seedDemoAccounts();

  const primaryPort = config.port || 5000;
  const secondaryPort = Number(primaryPort) === 5000 ? 5005 : 5000;

  server = app.listen(primaryPort, () => {
    logger.info(`=======================================================`);
    logger.info(`Sarkari Sugam AI Backend running on primary port ${primaryPort}`);
    logger.info(
      `Active Mode: ${
        config.demoMode ? 'DEMO_MODE (seeded / resilient playback)' : 'LIVE_MODE (TinyFish Web API)'
      }`
    );
    logger.info(`Database: ${config.databaseType.toUpperCase()} (${config.databaseType === 'postgresql' ? 'Supabase' : 'MongoDB'})`);
    logger.info(`TinyFish Status: ${config.tinyfish.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED (Safe Demo)'}`);
    logger.info(
      `Portal Auth Status: ${config.portal.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED (Simulated Auth)'}`
    );
    logger.info(`Alert Delivery: ${config.isSlackConfigured ? 'SLACK LIVE' : 'SIMULATED MODE'}`);
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
      logger.error(`[SYSTEM] Port ${primaryPort} is already in use by another process.`);
      process.exit(1);
    } else {
      logger.error(`[SYSTEM] Server runtime error:`, err);
    }
  });

  // Dual-port compatibility listener: bind secondary port (e.g. 5005) so any client/proxy targeting 5005 or 5000 connects instantly
  try {
    bridgeServer = app.listen(secondaryPort, () => {
      logger.info(`[SYSTEM] Compatibility bridge active on port ${secondaryPort} (both 5000 & 5005 reachable)`);
    });
    bridgeServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`[SYSTEM] Port ${secondaryPort} is in use; primary port ${primaryPort} remains fully active.`);
      } else {
        logger.warn(`[SYSTEM] Bridge port ${secondaryPort} error: ${err.message}`);
      }
    });
  } catch (err) {
    logger.warn(`[SYSTEM] Failed to start compatibility bridge on ${secondaryPort}: ${err.message}`);
  }
}

let server;
let bridgeServer;
startServer();

// Nodemon graceful reload
process.once('SIGUSR2', () => {
  const closePromises = [];
  if (server && server.listening) {
    closePromises.push(new Promise((resolve) => server.close(resolve)));
  }
  if (bridgeServer && bridgeServer.listening) {
    closePromises.push(new Promise((resolve) => bridgeServer.close(resolve)));
  }
  Promise.all(closePromises).then(() => {
    process.kill(process.pid, 'SIGUSR2');
  }).catch(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

// Graceful Shutdown on SIGINT and SIGTERM
let isShuttingDown = false;
function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`[SYSTEM] Received ${signal}. Initiating graceful shutdown...`);
  const closePromises = [];
  if (server && server.listening) {
    closePromises.push(new Promise((resolve) => server.close(resolve)));
  }
  if (bridgeServer && bridgeServer.listening) {
    closePromises.push(new Promise((resolve) => bridgeServer.close(resolve)));
  }
  Promise.all(closePromises).then(() => {
    logger.info('[SYSTEM] HTTP server connections closed. Process terminating safely.');
    process.exit(0);
  }).catch(() => {
    process.exit(0);
  });

  // Force termination if hanging after 3 seconds
  setTimeout(() => {
    process.exit(0);
  }, 3000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
