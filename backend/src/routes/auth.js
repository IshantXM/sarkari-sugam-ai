import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../../config/env.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendResetCodeEmail } from '../services/mailer.js';
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

// POST /api/auth/register (Direct JWT authentication)
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

// In-memory OTP code store for password resets (15 min TTL)
const resetStore = new Map();

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'A valid email address is required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No registered account was found with this email address.',
      });
    }

    // Generate 6-digit OTP code (valid for 15 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    resetStore.set(cleanEmail, { code, expiresAt });

    logger.info(`[AUTH RESET] Password reset code generated for ${cleanEmail}: ${code}`);

    // Send the email (via SMTP if configured, or via virtual test inbox)
    const mailRes = await sendResetCodeEmail(cleanEmail, code);

    res.json({
      status: 'success',
      message: mailRes.isRealSmtp
        ? `Verification code dispatched to ${cleanEmail}. Please check your inbox.`
        : `Verification code generated for ${cleanEmail}. Valid for 15 minutes.`,
      devCode: code,
      previewUrl: mailRes.previewUrl || null,
      isRealSmtp: mailRes.isRealSmtp,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, verification code, and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const record = resetStore.get(cleanEmail);

    if (!record || record.expiresAt < Date.now()) {
      resetStore.delete(cleanEmail);
      return res.status(400).json({
        status: 'error',
        message: 'Verification code has expired or was not requested. Please request a new code.',
      });
    }

    if (record.code !== code.toString().trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code. Please check and try again.',
      });
    }

    const updatedUser = await User.updatePassword(cleanEmail, newPassword);
    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User account could not be found.',
      });
    }

    resetStore.delete(cleanEmail);
    logger.info(`[AUTH RESET] Password successfully reset for user ${cleanEmail}`);

    res.json({
      status: 'success',
      message: 'Password has been updated successfully. Please sign in with your new credentials.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
