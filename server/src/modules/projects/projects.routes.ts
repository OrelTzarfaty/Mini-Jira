import { createProjectSchema } from '@mini-jira/shared';
import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { createRequireAuth } from '../../middleware/require-auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createAuthService } from '../auth/auth.service.js';
import { createProjectsController } from './projects.controller.js';
import { createProjectsService } from './projects.service.js';

export interface ProjectsRouterOptions {
  prisma: PrismaClient;
  authCookie: AuthCookie;
}

export function createProjectsRouter({ prisma, authCookie }: ProjectsRouterOptions): Router {
  const router = Router();
  const controller = createProjectsController(createProjectsService(prisma));
  const requireAuth = createRequireAuth(authCookie, createAuthService(prisma));

  // PRJ-1: any logged-in user may create a project. The app-wide origin check already blocks
  // cross-site POSTs; requireAuth runs before validation, so a visitor learns nothing about
  // the body rules (architecture §4.3).
  router.post('/projects', requireAuth, validateBody(createProjectSchema), controller.create);

  return router;
}
