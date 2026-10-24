import logger, { redactSecrets } from '../utils/logger.js';

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    error: 'route_not_found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    request_id: req.id || 'req_unknown',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Centralized error handling middleware.
 * Never leaks stack traces or credentials to clients.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const rawMessage = err.message || 'An unexpected internal server error occurred';
  const cleanMessage = redactSecrets(rawMessage);

  logger.error(`[HANDLER] ${req.method} ${req.path} failed with status ${statusCode}:`, cleanMessage);

  res.status(statusCode).json({
    status: 'error',
    error: err.code || (statusCode === 500 ? 'internal_server_error' : 'request_failed'),
    message: cleanMessage,
    request_id: req.id || 'req_unknown',
    timestamp: new Date().toISOString(),
  });
}

export default {
  notFoundHandler,
  errorHandler,
};
