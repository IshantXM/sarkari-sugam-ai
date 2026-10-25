import jwt from 'jsonwebtoken';
import config from '../../config/env.js';

// In-memory token revocation blacklist (stores token -> expiration timestamp)
const revokedTokens = new Map();

// Periodically clean up expired tokens from the blacklist (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of revokedTokens.entries()) {
    if (exp <= now) {
      revokedTokens.delete(token);
    }
  }
}, 10 * 60 * 1000).unref();

export function revokeToken(token) {
  if (!token) return;
  try {
    const decoded = jwt.decode(token);
    const expMs = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    revokedTokens.set(token, expMs);
  } catch {
    revokedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  }
}

export function isTokenRevoked(token) {
  if (!token) return false;
  const exp = revokedTokens.get(token);
  if (!exp) return false;
  if (exp <= Date.now()) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'Access denied. Missing bearer authorization token. Please sign in.',
      request_id: req.id || 'req_unknown',
      timestamp: new Date().toISOString(),
    });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({
      status: 'error',
      error: 'token_revoked',
      message: 'This session has been signed out and invalidated. Please sign in again.',
      request_id: req.id || 'req_unknown',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      error: 'invalid_token',
      message: 'Invalid or expired session token. Please re-authenticate.',
      request_id: req.id || 'req_unknown',
      timestamp: new Date().toISOString(),
    });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token && !isTokenRevoked(token)) {
    try {
      req.user = jwt.verify(token, config.jwt.secret);
      req.token = token;
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        error: 'insufficient_permissions',
        message: `Action requires one of the following roles: ${roles.join(', ')}`,
        request_id: req.id || 'req_unknown',
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}
