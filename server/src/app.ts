import express from 'express';
import type { Express, Router } from 'express';

import { createApiRouter } from './routes.js';

export interface AppOptions {
  apiRouter?: Router;
}

export function createApp({ apiRouter = createApiRouter() }: AppOptions = {}): Express {
  const app = express();

  app.use('/api', apiRouter);

  return app;
}
