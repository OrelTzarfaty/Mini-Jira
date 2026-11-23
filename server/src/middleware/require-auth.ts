import type { RequestHandler } from 'express';

import type { AuthCookie } from '../lib/auth-cookie.js';
import { UnauthenticatedError } from '../lib/errors.js';

/** The logged-in user, as far as the session cookie tells us. */
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

// AUTH-3: the first step of every protected route (architecture §6). A missing, tampered,
// expired or otherwise invalid session cookie gets one 401 that never says which (fail closed).
export function createRequireAuth(authCookie: AuthCookie): RequestHandler {
  return async (req, _res, next) => {
    const userId = await authCookie.readUserId(req);

    if (!userId) {
      next(new UnauthenticatedError());

      return;
    }

    req.user = { id: userId };
    next();
  };
}
