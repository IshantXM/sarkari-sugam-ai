import { Router } from 'express';
import { z } from 'zod';
import { testConnection, switchDatabase, getActiveDatabaseStatus } from '../db/manager.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Strictly enforce JWT authentication on database management endpoints
router.use(authenticateToken);

const uriSchema = z.object({
  uri: z.string().min(5, 'Connection string is required'),
});

// GET /api/database/status
router.get('/status', async (req, res, next) => {
  try {
    const status = await getActiveDatabaseStatus();
    res.json({
      status: 'success',
      data: status,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/database/test
router.post('/test', async (req, res, next) => {
  try {
    const parsed = uriSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0].message,
      });
    }

    const testRes = await testConnection(parsed.data.uri);
    res.json({
      status: testRes.ok ? 'success' : 'error',
      ...testRes,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/database/connect
router.post('/connect', async (req, res, next) => {
  try {
    const parsed = uriSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0].message,
      });
    }

    const updated = await switchDatabase(parsed.data.uri);
    res.json({
      status: 'success',
      message: `Database switched to ${updated.type} (${updated.database})`,
      data: updated,
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message,
    });
  }
});

export default router;
