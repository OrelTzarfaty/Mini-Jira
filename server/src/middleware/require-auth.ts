import type { Request, RequestHandler } from 'express';

import type { AuthCookie } from '../lib/auth-cookie.js';
import { UnauthenticatedError } from '../lib/errors.js';
import type { AuthService } from '../modules/auth/auth.service.js';

/** The logged-in user: a valid session cookie whose user exists. */
export interface AuthUser {
  id: string;
}

// Adds `req.user` to Express's own Request type, so every handler sees it typed.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- @types/express declares Request in this global namespace for apps to extend; there is no module syntax for it.
  namespace Express {
    interface Request {
      /** Set by requireAuth; only routes behind it can rely on it. */
      user?: AuthUser;
    }
  }
}

// AUTH-3: the first step of every protected route (architecture §6). A missing, tampered or
// expired session cookie, or one whose user no longer exists (engineering standards §7), gets
// one 401 that never says which (fail closed). A database error is not a 401: Express sends the
// rejected promise to the error handler (500).
export function createRequireAuth(
  authCookie: AuthCookie,
  authService: Pick<AuthService, 'userExists'>,
): RequestHandler {
  return async (req, _res, next) => {
    const userId = await authCookie.readUserId(req);

    if (!userId || !(await authService.userExists(userId))) {
      next(new UnauthenticatedError());

      return;
    }

    req.user = { id: userId };
    next();
  };
}

/**
 * The logged-in user's ID, for handlers behind requireAuth. A missing user means the route was
 * wired without requireAuth, so it fails closed with 401 instead of trusting an undefined ID.
 */
export function requireUserId(req: Request): string {
  if (!req.user) {
    throw new UnauthenticatedError();
  }

  return req.user.id;
}
