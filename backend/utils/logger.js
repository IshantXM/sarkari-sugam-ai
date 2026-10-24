import config from '../config/env.js';

// Collect secret values to redact
function getSecrets() {
  const secrets = [];
  if (config.tinyfish.apiKey && config.tinyfish.apiKey.length > 3) {
    secrets.push(config.tinyfish.apiKey);
  }
  if (config.portal.user && config.portal.user.length > 2) {
    secrets.push(config.portal.user);
  }
  if (config.portal.pass && config.portal.pass.length > 2) {
    secrets.push(config.portal.pass);
  }
  return secrets;
}

/**
 * Recursively redacts secrets and sensitive fields from strings and objects
 */
export function redactSecrets(data) {
  if (data === null || data === undefined) return data;

  const secrets = getSecrets();

  if (typeof data === 'string') {
    let sanitized = data;
    for (const secret of secrets) {
      sanitized = sanitized.replaceAll(secret, '***REDACTED***');
    }
    // Also scrub potential Bearer tokens or API keys
    sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{8,}/gi, '$1***REDACTED***');
    sanitized = sanitized.replace(/([xX]-[a-zA-Z0-9_\-]+:\s*)[^\s,]+/gi, '$1***REDACTED***');
    return sanitized;
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map((item) => redactSecrets(item));
    }

    const sanitizedObj = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('pass') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('token') ||
        lowerKey.includes('authorization')
      ) {
        sanitizedObj[key] = '***REDACTED***';
      } else {
        sanitizedObj[key] = redactSecrets(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export const logger = {
  info(message, meta) {
    const ts = new Date().toISOString();
    const cleanMsg = redactSecrets(message);
    if (meta !== undefined) {
      console.log(`[${ts}] [INFO] ${cleanMsg}`, redactSecrets(meta));
    } else {
      console.log(`[${ts}] [INFO] ${cleanMsg}`);
    }
  },

  warn(message, meta) {
    const ts = new Date().toISOString();
    const cleanMsg = redactSecrets(message);
    if (meta !== undefined) {
      console.warn(`[${ts}] [WARN] ${cleanMsg}`, redactSecrets(meta));
    } else {
      console.warn(`[${ts}] [WARN] ${cleanMsg}`);
    }
  },

  error(message, error) {
    const ts = new Date().toISOString();
    const cleanMsg = redactSecrets(message);
    let cleanErr = '';
    if (error instanceof Error) {
      cleanErr = redactSecrets(error.message);
    } else if (error) {
      cleanErr = redactSecrets(error);
    }
    console.error(`[${ts}] [ERROR] ${cleanMsg} ${cleanErr}`);
  },

  request({ method, path, status, durationMs, requestId }) {
    const ts = new Date().toISOString();
    console.log(
      `[${ts}] [REQ] id=${requestId} ${method} ${path} status=${status} duration=${durationMs}ms`
    );
  },
};

export default logger;
