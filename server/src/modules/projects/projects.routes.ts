import { createProjectSchema, updateProjectSchema } from '@mini-jira/shared';
import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { createLoadProjectAccess, requireOwner } from '../../middleware/project-access.js';
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
  const projectsService = createProjectsService(prisma);
  const controller = createProjectsController(projectsService);
  const requireAuth = createRequireAuth(authCookie, createAuthService(prisma));
  // PRJ-6: every /projects/:projectKey/... route runs requireAuth (401) then loadProjectAccess
  // (404 for a missing project or a non-member); owner-only routes add requireOwner (403).
  const loadProjectAccess = createLoadProjectAccess(projectsService);

  // PRJ-1: any logged-in user may create a project. The app-wide origin check already blocks
  // cross-site POSTs; requireAuth runs before validation, so a visitor learns nothing about
  // the body rules (architecture §4.3).
  router.post('/projects', requireAuth, validateBody(createProjectSchema), controller.create);

  // PRJ-2: My Projects. requireAuth runs first; the controller then parses the query (400).
  router.get('/projects', requireAuth, controller.list);

  // PRJ-6: a member (OWNER or MEMBER) gets the project with their role.
  const projectPath = '/projects/:projectKey';
  router.get(projectPath, requireAuth, loadProjectAccess, controller.get);

  // PRJ-5: only the owner may edit the name and description (403 for a member). The app-wide
  // origin check blocks cross-site PATCHes; the body is validated last, so only the owner
  // learns its rules.
  router.patch(
    projectPath,
    requireAuth,
    loadProjectAccess,
    requireOwner,
    validateBody(updateProjectSchema),
    controller.update,
  );

  return router;
}
