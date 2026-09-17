/**
 * HTTP error class used throughout the API.
 * Pass details (e.g. Zod issue array) as the third argument;
 * it will be included in the error envelope under `error.details`.
 */
export class HttpError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} message Human-readable message
   * @param {any}    [details] Optional structured details (e.g. validation issues)
   */
  constructor(status, message, details) {
    super(message);
    this.status  = status;
    this.code    = `HTTP_${status}`;
    this.details = details ?? null;
  }
}

/** Catches unmatched routes and forwards a 404 HttpError. */
export function notFound(req, _res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler — MUST be the last app.use() call.
 * Emits the standard error envelope that the envelopeMiddleware will NOT
 * re-wrap (because the object already has a boolean `success` field).
 *
 * eslint-disable-next-line no-unused-vars — Express identifies error
 * handlers by their 4-argument signature.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status  = err.status ?? 500;
  const message = err.message ?? 'Internal server error';
  const code    = err.code   ?? `HTTP_${status}`;

  if (status >= 500) console.error(err);

  // Bypass the envelope middleware by passing `success` as a boolean field.
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: err.details ?? null,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId ?? 'unknown',
    },
  });
}
