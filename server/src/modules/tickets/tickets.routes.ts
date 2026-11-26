import { createTicketSchema, updateTicketSchema } from '@mini-jira/shared';
import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { createLoadProjectAccess } from '../../middleware/project-access.js';
import { createRequireAuth } from '../../middleware/require-auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createAuthService } from '../auth/auth.service.js';
import { createProjectsService } from '../projects/projects.service.js';
import { createTicketsController } from './tickets.controller.js';
import { createTicketsService } from './tickets.service.js';

export interface TicketsRouterOptions {
  prisma: PrismaClient;
  authCookie: AuthCookie;
}

export function createTicketsRouter({ prisma, authCookie }: TicketsRouterOptions): Router {
  const router = Router();
  const controller = createTicketsController(createTicketsService(prisma));
  const requireAuth = createRequireAuth(authCookie, createAuthService(prisma));
  // PRJ-6: requireAuth (401) → loadProjectAccess (404 for a missing project or a non-member)
  // run before anything else, so an outsider learns nothing, not even the body rules.
  const loadProjectAccess = createLoadProjectAccess(createProjectsService(prisma));

  // TKT-1: any member (OWNER or MEMBER) may create a ticket. The app-wide origin check blocks
  // cross-site POSTs; the body is validated last.
  router.post(
    '/projects/:projectKey/tickets',
    requireAuth,
    loadProjectAccess,
    validateBody(createTicketSchema),
    controller.create,
  );

  // TKT-2: any member may read a ticket of the project by its key (WEB-12).
  router.get(
    '/projects/:projectKey/tickets/:ticketKey',
    requireAuth,
    loadProjectAccess,
    controller.get,
  );

  // TKT-3: any member may edit a ticket. Same order as create: access checks first, then the body.
  router.patch(
    '/projects/:projectKey/tickets/:ticketKey',
    requireAuth,
    loadProjectAccess,
    validateBody(updateTicketSchema),
    controller.update,
  );

  // TKT-4: any member may call it, but only the ticket's reporter or the project owner may
  // delete (403 for other members, decided in the service). The app-wide origin check blocks
  // cross-site DELETEs.
  router.delete(
    '/projects/:projectKey/tickets/:ticketKey',
    requireAuth,
    loadProjectAccess,
    controller.delete,
  );

  return router;
}
