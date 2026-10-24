import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/env.js';
import logger from './utils/logger.js';
import healthRouter from './routes/health.js';
import tendersRouter from './routes/tenders.js';
import authRouter, { seedDemoAccounts } from './src/routes/auth.js';
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
app.use('/api/tenders', tendersRouter);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Central Error Handler (never leaks secrets or stack traces)
app.use(errorHandler);

// Connect to MongoDB and start server
async function startServer() {
  await connectDB();
  await seedDemoAccounts();

  server = app.listen(config.port, () => {
    logger.info(`=======================================================`);
    logger.info(`Sarkari Sugam AI Backend running on port ${config.port}`);
    logger.info(
      `Active Mode: ${
        config.demoMode ? 'DEMO_MODE (seeded / resilient playback)' : 'LIVE_MODE (TinyFish Web API)'
      }`
    );
    logger.info(`MongoDB Status: ${config.mongodbUri ? 'CONFIGURED (' + config.mongodbUri + ')' : 'NONE'}`);
    logger.info(`TinyFish Status: ${config.tinyfish.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED (Safe Demo)'}`);
    logger.info(
      `Portal Auth Status: ${config.portal.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED (Simulated Auth)'}`
    );
    logger.info(`Alert Delivery: ${config.isSlackConfigured ? 'SLACK LIVE' : 'SIMULATED MODE'}`);
    logger.info(`=======================================================`);
  });
}

let server;
startServer();

// Graceful Shutdown on SIGINT and SIGTERM
function handleShutdown(signal) {
  logger.info(`[SYSTEM] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    logger.info('[SYSTEM] HTTP server connections closed. Process terminating safely.');
    process.exit(0);
  });

  // Force termination if hanging after 5 seconds
  setTimeout(() => {
    logger.error('[SYSTEM] Graceful shutdown timeout expired. Forcing exit.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
