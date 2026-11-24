import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { createLoadProjectAccess } from '../../middleware/project-access.js';
import { createRequireAuth } from '../../middleware/require-auth.js';
import { createAuthService } from '../auth/auth.service.js';
import { createProjectsService } from '../projects/projects.service.js';
import { createMembersController } from './members.controller.js';
import { createMembersService } from './members.service.js';

export interface MembersRouterOptions {
  prisma: PrismaClient;
  authCookie: AuthCookie;
}

export function createMembersRouter({ prisma, authCookie }: MembersRouterOptions): Router {
  const router = Router();
  const controller = createMembersController(createMembersService(prisma));
  const requireAuth = createRequireAuth(authCookie, createAuthService(prisma));
  // PRJ-6: requireAuth (401) → loadProjectAccess (404 for a missing project or a non-member)
  // run before anything else, so an outsider learns nothing, not even the query rules.
  const loadProjectAccess = createLoadProjectAccess(createProjectsService(prisma));
  const membersPath = '/projects/:projectKey/members';

  // PRJ-3: any member (OWNER or MEMBER) may list the members, 20 per page.
  router.get(membersPath, requireAuth, loadProjectAccess, controller.list);

  return router;
}
