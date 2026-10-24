import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../../config/env.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PROCUREMENT_OFFICER', 'BIDDER_VENDOR', 'AUDITOR']).optional().default('PROCUREMENT_OFFICER'),
  department: z.string().optional().default('MoRTH National Highways Division'),
  organization: z.string().optional().default('Government of India'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Seed default accounts in MongoDB if empty
export async function seedDemoAccounts() {
  try {
    const demoAccounts = [
      {
        name: 'Ishant Mohan',
        email: 'ishantmohan045@gmail.com',
        password: 'sugam123',
        role: 'PROCUREMENT_OFFICER',
        department: 'MoRTH National Highways Division',
        organization: 'Ministry of Road Transport and Highways',
      },
      {
        name: 'National EPC Consortium',
        email: 'vendor@infra-bidder.in',
        password: 'sugam123',
        role: 'BIDDER_VENDOR',
        department: 'Class 1 Highway Contractor',
        organization: 'Federation of Infrastructure Bidders',
      },
    ];

    for (const acc of demoAccounts) {
      const existing = await User.findOne({ email: acc.email });
      if (!existing) {
        await User.create(acc);
        logger.info(`[AUTH SEED] Created demo account: ${acc.email} (${acc.role})`);
      }
    }

    // Seed baseline tender if empty
    const Tender = (await import('../models/Tender.js')).default;
    const tenderCount = await Tender.countDocuments();
    if (tenderCount === 0) {
      await Tender.create({
        tender_id: 'TNDR-SWWYD8TQHQYENTNI',
        title: 'Improvement of SH 52 from Anparu Siddapura, Thirthahalli Kundapura, Udupi Dist.',
        issuing_agency: 'EE NH Division Shivamogga - MoRTH',
        budget_usd: 1250000,
        submission_deadline: '24-Nov-2026',
        eligibility: 'Works Category, Open Tender',
        source_url:
          'https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SWWYD8TQhQYENtniIfmtVcw%3D%3D',
        extraction_confidence: 0.85,
        status: 'MONITORED',
        saved_by: 'ishantmohan045@gmail.com',
      });
      logger.info('[TENDER SEED] Seeded initial baseline tender into MongoDB');
    }
  } catch (err) {
    logger.warn(`[AUTH SEED] Note: Could not auto-seed: ${err.message}`);
  }
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        error: 'validation_error',
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const { name, email, password, role, department, organization } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        error: 'user_exists',
        message: 'An account with this email already exists.',
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      department,
      organization,
    });

    const token = jwt.sign(
      {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        organization: newUser.organization,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      status: 'success',
      token,
      user: newUser.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        error: 'validation_error',
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        error: 'invalid_credentials',
        message: 'Invalid email address or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        error: 'invalid_credentials',
        message: 'Invalid email address or password.',
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        organization: user.organization,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      status: 'success',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me (re-validates session)
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      // Fallback to token payload if user record is cached
      return res.json({
        status: 'success',
        user: req.user,
      });
    }
    res.json({
      status: 'success',
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
