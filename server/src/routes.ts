import { Router } from 'express';

import { createAuthRouter } from './modules/auth/auth.routes.js';
import type { AuthRouterOptions } from './modules/auth/auth.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createProjectsRouter } from './modules/projects/projects.routes.js';
import { createOpenApiRouter } from './openapi/openapi.routes.js';

export type ApiDependencies = AuthRouterOptions;

export function createApiRouter(dependencies: ApiDependencies): Router {
  const router = Router();

  router.use(createHealthRouter());
  router.use(createAuthRouter(dependencies));
  router.use(createProjectsRouter(dependencies));
  router.use(createOpenApiRouter());

  return router;
}
