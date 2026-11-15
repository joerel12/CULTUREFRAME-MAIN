'use strict';

const { z } = require('zod');

/**
 * Returns an Express middleware that validates req.body / req.query / req.params
 * against a Zod schema.
 *
 * Usage:
 *   router.post('/login', validateRequest({ body: loginSchema }), controller)
 */
function validateRequest({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      return next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters.',
            details: err.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }
      return next(err);
    }
  };
}

module.exports = { validateRequest };
