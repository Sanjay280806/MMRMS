export class HttpError extends Error {
  constructor(status, message, details = null, code = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code || defaultCodeForStatus(status);
  }
}

function defaultCodeForStatus(status) {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 423: return 'ACCOUNT_LOCKED';
    default: return `HTTP_${status}`;
  }
}

export function notFound(req, _res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`, null, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);

  const code = err.code || defaultCodeForStatus(status);
  const message = err.message || 'Internal server error';
  const details = err.details || null;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId ?? null,
    },
  });
}
