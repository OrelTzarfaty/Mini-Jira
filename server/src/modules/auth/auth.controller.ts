import type { LoginInput, PublicUser, RegisterInput } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import type { AuthCookie } from '../../lib/auth-cookie.js';
import type { AuthService } from './auth.service.js';

// The body types are safe because validateBody(registerSchema / loginSchema) runs before
// these handlers.
type RegisterHandler = RequestHandler<Record<string, string>, PublicUser, RegisterInput>;
type LoginHandler = RequestHandler<Record<string, string>, PublicUser, LoginInput>;

export interface AuthController {
  register: RegisterHandler;
  login: LoginHandler;
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
  };
}
