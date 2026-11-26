import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { createLoadProjectAccess } from '../../middleware/project-access.js';
import { createRequireAuth } from '../../middleware/require-auth.js';
import { createAuthService } from '../auth/auth.service.js';
import { createProjectsService } from '../projects/projects.service.js';
import { createBoardController } from './board.controller.js';
import { createBoardService } from './board.service.js';

export interface BoardRouterOptions {
  prisma: PrismaClient;
  authCookie: AuthCookie;
}

export function createBoardRouter({ prisma, authCookie }: BoardRouterOptions): Router {
  const router = Router();
  const controller = createBoardController(createBoardService(prisma));
  const requireAuth = createRequireAuth(authCookie, createAuthService(prisma));
  // PRJ-6: requireAuth (401) → loadProjectAccess (404 for a missing project or a non-member)
  // run before anything else, so an outsider learns nothing, not even the query rules.
  const loadProjectAccess = createLoadProjectAccess(createProjectsService(prisma));

  // BRD-1: any member (OWNER or MEMBER) may see the board and load more cards of a column.
  router.get('/projects/:projectKey/board', requireAuth, loadProjectAccess, controller.getBoard);
  router.get(
    '/projects/:projectKey/board/columns/:status',
    requireAuth,
    loadProjectAccess,
    controller.getColumn,
  );

  return router;
}
