/**
 * Response envelope middleware.
 *
 * Monkey-patches res.json so that every route response is automatically
 * wrapped in the standard envelope:
 *   { success: true, data: <payload>, message: '', meta: { timestamp, requestId } }
 *
 * The error handler bypasses this by passing an object that already contains
 * a boolean `success` field — the middleware detects this and passes it
 * through unchanged, avoiding double-wrapping.
 *
 * IMPORTANT: Mount this middleware BEFORE route handlers.
 */
export function envelopeMiddleware(req, res, next) {
  const _json = res.json.bind(res);

  res.json = function envelope(data) {
    // Already shaped by error handler or an explicit bypass — pass through.
    if (data !== null && typeof data === 'object' && 'success' in data) {
      return _json(data);
    }
    return _json({
      success: true,
      data,
      message: '',
      meta: {
        timestamp:  new Date().toISOString(),
        requestId:  req.requestId ?? 'unknown',
      },
    });
  };

  next();
}
