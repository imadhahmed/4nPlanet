// api/lib/response.js
// Consistent API response helpers

/**
 * Send a success response.
 */
export function ok(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response. Never exposes stack traces in production.
 */
export function fail(res, message = 'An error occurred', statusCode = 500, details = null) {
  const body = { success: false, message };
  if (details && process.env.NODE_ENV !== 'production') {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}

/**
 * Wrap an async route handler to catch errors uniformly.
 */
export function asyncHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[API Error]', err);
      const code = err.statusCode || err.status || 500;
      let message = code < 500 ? err.message : 'Internal server error';
      if (err.validationErrors && err.validationErrors.length > 0) {
        message = err.validationErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
      }
      return fail(res, message, code, err.validationErrors || err.message);
    }
  };
}

/**
 * Standard validation error response (422 Unprocessable Entity).
 */
export function validationError(res, errors) {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}
