import type { LoginInput, PublicUser, RegisterInput } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import type { AuthCookie } from '../../lib/auth-cookie.js';
import { requireUserId } from '../../middleware/require-auth.js';
import type { AuthService } from './auth.service.js';

// The body types are safe because validateBody(registerSchema / loginSchema) runs before
// these handlers.
type RegisterHandler = RequestHandler<Record<string, string>, PublicUser, RegisterInput>;
type LoginHandler = RequestHandler<Record<string, string>, PublicUser, LoginInput>;

export interface AuthController {
  register: RegisterHandler;
  login: LoginHandler;
  logout: RequestHandler;
  me: RequestHandler<Record<string, string>, PublicUser>;
}

export function createAuthController(
  authService: AuthService,
  authCookie: AuthCookie,
): AuthController {
  return {
    // AUTH-1: register also logs the user in (architecture §11, default 4).
    async register(req, res) {
      const user = await authService.register(req.body);
      await authCookie.set(res, user.id);
      // The user ID only: emails stay out of the logs (engineering standards §6.6).
      req.log.info({ userId: user.id }, 'User registered');
      res.status(201).json(user);
    },

    // AUTH-2: a wrong email or password is thrown by the service as 401 INVALID_CREDENTIALS;
    // the error handler logs only its code, never which email was tried.
    async login(req, res) {
      const user = await authService.login(req.body);
      await authCookie.set(res, user.id);
      req.log.info({ userId: user.id }, 'User logged in');
      res.status(200).json(user);
    },

    // AUTH-3: always clears the cookie and answers 204, even without a valid session, so a
    // user whose token already expired can still get rid of it. The token is read only to
    // log who logged out; it can't be revoked (architecture §7).
    async logout(req, res) {
      const userId = await authCookie.readUserId(req);
      authCookie.clear(res);
      if (userId) {
        req.log.info({ userId }, 'User logged out');
      }
      res.status(204).end();
    },

    // AUTH-4: the web app calls this on every page load to restore the session after a
    // refresh. requireAuth runs first, so req.user is set here.
    async me(req, res) {
      const user = await authService.getCurrentUser(requireUserId(req));
      // Personal data: no browser or shared cache may keep it (e.g. the back button after
      // logout, or a proxy serving it to another user).
      res.set('Cache-Control', 'no-store');
      res.status(200).json(user);
    },
  };
}
