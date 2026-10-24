import { z } from 'zod';

/**
 * Reusable strict HTTP/HTTPS URL Zod validator
 * Rejects javascript:, file:, data:, ftp:, etc.
 */
export const httpUrlSchema = z
  .string({ required_error: 'URL is required' })
  .trim()
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid HTTP or HTTPS URL' }
  );

/**
 * Middleware factory that validates request body with a Zod schema.
 * Automatically ignores any client-supplied credentials and returns
 * structured HTTP 400 errors if validation fails.
 *
 * @param {z.ZodSchema} schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    // Security: ignore client-provided credentials completely
    if (req.body && typeof req.body === 'object' && 'credentials' in req.body) {
      delete req.body.credentials;
    }

    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join('.') || 'body',
        message: err.message,
      }));

      return res.status(400).json({
        status: 'error',
        error: 'validation_failed',
        details,
        request_id: req.id || 'req_unknown',
        timestamp: new Date().toISOString(),
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

export default {
  validateBody,
  httpUrlSchema,
};
