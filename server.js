import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './backend/src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  const app = createApp();

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        host: HOST,
      },
      appType: 'spa',
      root: path.resolve(__dirname, 'frontend'),
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`MMRMS server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
