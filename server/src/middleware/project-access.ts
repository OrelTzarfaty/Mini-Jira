import {
  isProjectKey,
  PROJECT_NOT_FOUND_MESSAGE,
  PROJECT_OWNER_ONLY_MESSAGE,
  Role,
} from '@mini-jira/shared';
import type { Request, RequestHandler } from 'express';

import type { Project as ProjectRow } from '../generated/prisma/client.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import type { ProjectAccess, ProjectsService } from '../modules/projects/projects.service.js';
import { requireUserId } from './require-auth.js';

/** The caller's membership in the project of the current request. */
export interface ProjectMembership {
  role: Role;
}

// Adds `req.project` and `req.membership` to Express's own Request type (like `req.user`).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- @types/express declares Request in this global namespace for apps to extend; there is no module syntax for it.
  namespace Express {
    interface Request {
      /** Set by loadProjectAccess; only routes behind it can rely on it. */
      project?: ProjectRow;
      /** Set by loadProjectAccess: the caller's role in `req.project`. */
      membership?: ProjectMembership;
    }
  }
}

// One error for "no such project" and "not a member", so the 404 never reveals that a project
// exists (PRJ-6, architecture §6).
const projectNotFound = (): NotFoundError => new NotFoundError(PROJECT_NOT_FOUND_MESSAGE);

/**
 * PRJ-6 (architecture §6): the second step of every `/api/projects/:projectKey/...` route, after
 * requireAuth. The key is matched exactly (no uppercasing, so each project has one URL); a value
 * that can't be a key gets the 404 at once, without a query. A missing project and a project the
 * caller isn't a member of go through the same code path and get the same 404.
 */
export function createLoadProjectAccess(
  projectsService: Pick<ProjectsService, 'findProjectAccess'>,
): RequestHandler<{ projectKey: string }> {
  return async (req, _res, next) => {
    const userId = requireUserId(req);
    const { projectKey } = req.params;

    const access = isProjectKey(projectKey)
      ? await projectsService.findProjectAccess(userId, projectKey)
      : null;

    if (!access) {
      next(projectNotFound());

      return;
    }

    req.project = access.project;
    req.membership = { role: access.role };
    next();
  };
}

/**
 * PRJ-6 (architecture §6): owner-only routes (edit/delete project, add/remove members) put this
 * after loadProjectAccess. A member who isn't the owner gets 403: they already know the project
 * exists, so a 404 would hide nothing.
 */
export const requireOwner: RequestHandler = (req, _res, next) => {
  if (requireProjectAccess(req).role !== Role.OWNER) {
    next(new ForbiddenError(PROJECT_OWNER_ONLY_MESSAGE));

    return;
  }

  next();
};

/**
 * The project and the caller's role, for handlers behind loadProjectAccess. Missing values mean
 * the route was wired without it, which is a programming error: it fails closed (500) instead of
 * serving a project to someone whose membership was never checked.
 */
export function requireProjectAccess(req: Request): ProjectAccess {
  if (!req.project || !req.membership) {
    throw new Error('loadProjectAccess must run before this handler');
  }

  return { project: req.project, role: req.membership.role };
}
