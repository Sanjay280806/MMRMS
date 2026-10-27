import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    hmr: false,
    host: '0.0.0.0',
    port: 5173,
    // Keeps the client on one origin: /api is proxied to the Express server.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // Give the backend up to 10 s to respond on a cold start
        proxyTimeout: 10000,
        timeout: 10000,
        // Gracefully handle ECONNREFUSED / ECONNRESET instead of crashing
        // the proxy with a hard 502.  The frontend client.js will retry.
        configure(proxy) {
          proxy.on('error', (err, req, res) => {
            const code = err.code || '';
            const isConnErr =
              code === 'ECONNREFUSED' ||
              code === 'ECONNRESET' ||
              code === 'ETIMEDOUT' ||
              code === 'ENOTFOUND';
            if (isConnErr && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend is starting up. Please wait a moment.' },
                }),
              );
            }
          });
        },
      },
    },
  },
});
