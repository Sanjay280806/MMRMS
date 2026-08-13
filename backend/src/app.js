import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import advisorRoutes from './routes/advisor.routes.js';
import coordinatorRoutes from './routes/coordinator.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.disable('etag');

  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'mmrms-api' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/mentor', mentorRoutes);
  app.use('/api/advisor', advisorRoutes);
  app.use('/api/coordinator', coordinatorRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
