import { Router } from 'express';
import config from '../config/env.js';
import { getDBStatus } from '../src/db/connection.js';

const router = Router();

/**
 * GET /api/health
 * Returns service status, MongoDB connectivity, configuration flags, and uptime.
 * Never includes raw secret values.
 */
router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    ok: true,
    database: dbStatus,
    mongodb: dbStatus, // backward compatibility
    demo_mode: config.demoMode,
    tinyfish_configured: config.tinyfish.isConfigured,
    portal_credentials_configured: config.portal.isConfigured,
    slack_configured: config.isSlackConfigured,
    uptime_seconds: Math.floor(process.uptime()),
    version: '1.0.0',
    request_id: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
