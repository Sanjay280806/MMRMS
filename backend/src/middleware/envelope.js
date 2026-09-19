export function envelopeMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const isError = res.statusCode >= 400;
    const timestamp = new Date().toISOString();
    const requestId = req.requestId ?? null;

    if (isError) {
      if (body && typeof body === 'object' && body.success === false && body.error) {
        if (!body.meta) {
          body.meta = { timestamp, requestId };
        }
        return originalJson(body);
      }

      const code = body?.code || (typeof body?.error === 'object' && body?.error?.code) || (res.statusCode === 423 ? 'ACCOUNT_LOCKED' : `HTTP_${res.statusCode}`);
      const message = typeof body?.error === 'string'
        ? body.error
        : (body?.error?.message || body?.message || 'Request failed');
      const details = body?.details || body?.error?.details || (body?.lockedUntil ? { lockedUntil: body.lockedUntil, retryInSeconds: body.retryInSeconds } : null);

      return originalJson({
        success: false,
        error: {
          code,
          message,
          ...(details ? { details } : {}),
        },
        meta: { timestamp, requestId },
      });
    }

    if (body && typeof body === 'object' && body.success === true && body.data !== undefined) {
      if (!body.meta) {
        body.meta = { timestamp, requestId };
      }
      return originalJson(body);
    }

    return originalJson({
      success: true,
      data: body === undefined ? null : body,
      message: '',
      meta: { timestamp, requestId },
    });
  };

  next();
}
