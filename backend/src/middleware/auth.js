import jwt from 'jsonwebtoken';
import config from '../../config/env.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      error: 'unauthorized',
      message: 'Access denied. Missing bearer authorization token.',
      request_id: req.id || 'req_unknown',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      status: 'error',
      error: 'forbidden',
      message: 'Invalid or expired session token. Please re-authenticate.',
      request_id: req.id || 'req_unknown',
      timestamp: new Date().toISOString(),
    });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwt.secret);
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
