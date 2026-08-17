import app from '../backend/server.js';

export function withApiPrefix(prefix) {
  return function handler(req, res) {
    if (!req.url.startsWith('/api/')) {
      req.url = `${prefix}${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }

    return app(req, res);
  };
}
