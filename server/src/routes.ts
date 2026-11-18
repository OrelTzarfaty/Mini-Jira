import { Router } from 'express';

import { createHealthRouter } from './modules/health/health.routes.js';

export function createApiRouter(): Router {
  const router = Router();

  router.use(createHealthRouter());

  return router;
}
