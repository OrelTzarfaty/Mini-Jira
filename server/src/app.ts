import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express, Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { createHttpLogger } from './middleware/http-logger.js';
import { createApiRouter } from './routes.js';

const JSON_BODY_LIMIT = '100kb';
// nginx is the only proxy in front of the API.
const TRUSTED_PROXY_HOPS = 1;

export interface AppOptions {
  logger: Logger;
  clientOrigin: string;
  apiRouter?: Router;
}

export function createApp({
  logger,
  clientOrigin,
  apiRouter = createApiRouter(),
}: AppOptions): Express {
  const app = express();

  app.set('trust proxy', TRUSTED_PROXY_HOPS);

  app.use(createHttpLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  app.use('/api', apiRouter);

  return app;
}
