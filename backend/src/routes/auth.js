import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../../config/env.js';
import User from '../models/User.js';
import { authenticateToken, revokeToken } from '../middleware/auth.js';
import { sendResetCodeEmail } from '../services/mailer.js';
import logger from '../../utils/logger.js';

const router = Router();

// Validation schemas (roles and department removed from user registration)
const registerSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});


// POST /api/auth/register (Direct JWT authentication without role/dept complexity)
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

    const { name, email, password } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        error: 'user_exists',
        message: 'An account with this email already exists.',
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'USER',
      department: 'General',
      organization: 'Government of India',
    });

    const token = jwt.sign(
      {
        id: (newUser._id || newUser.id).toString(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || 'USER',
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
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
        id: (user._id || user.id).toString(),
        email: user.email,
        name: user.name,
        role: user.role || 'USER',
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

// POST /api/auth/logout (Properly revokes and deletes the JWT token)
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    revokeToken(token);
    logger.info(`[AUTH] Session token invalidated and revoked on logout`);
  }
  res.json({
    status: 'success',
    message: 'Logged out successfully. JWT session token has been revoked.',
  });
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
        : `Verification code dispatched to ${cleanEmail}. Valid for 15 minutes.`,
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
