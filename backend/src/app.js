import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

import authRoutes from './routes/auth.routes.js';
import refreshRoutes from './routes/refresh.routes.js';
import studentRoutes from './routes/student.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import advisorRoutes from './routes/advisor.routes.js';
import coordinatorRoutes from './routes/coordinator.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import { envelopeMiddleware } from './middleware/envelope.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.disable('etag');

  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '8mb' }));
  app.use(morgan('dev'));

  app.use((req, _res, next) => {
    req.requestId = uuidv4();
    next();
  });

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.use(envelopeMiddleware);

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'mmrms-api' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/auth', refreshRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/mentor', mentorRoutes);
  app.use('/api/advisor', advisorRoutes);
  app.use('/api/coordinator', coordinatorRoutes);
  app.use('/api/announcements', announcementRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
