import { Router } from 'express';

import { createHealthRouter } from './modules/health/health.routes.js';
import { createOpenApiRouter } from './openapi/openapi.routes.js';

export function createApiRouter(): Router {
  const router = Router();

  router.use(createHealthRouter());
  router.use(createOpenApiRouter());

  return router;
}
