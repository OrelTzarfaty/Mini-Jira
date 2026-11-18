import express from 'express';
import type { Express, Router } from 'express';
import type { Logger } from 'pino';

import { createHttpLogger } from './middleware/http-logger.js';
import { createApiRouter } from './routes.js';

export interface AppOptions {
  logger: Logger;
  apiRouter?: Router;
}

export function createApp({ logger, apiRouter = createApiRouter() }: AppOptions): Express {
  const app = express();

  app.use(createHttpLogger(logger));
  app.use('/api', apiRouter);

  return app;
}
