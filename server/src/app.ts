import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express, Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createHttpLogger } from './middleware/http-logger.js';
import { createOriginCheck } from './middleware/origin-check.js';

const JSON_BODY_LIMIT = '100kb';
// nginx is the only proxy in front of the API.
const TRUSTED_PROXY_HOPS = 1;

export interface AppOptions {
  logger: Logger;
  clientOrigin: string;
  /** Everything under /api (see routes.ts). */
  apiRouter: Router;
}

export function createApp({ logger, clientOrigin, apiRouter }: AppOptions): Express {
  const app = express();

  app.set('trust proxy', TRUSTED_PROXY_HOPS);

  app.use(createHttpLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(createOriginCheck(clientOrigin));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
