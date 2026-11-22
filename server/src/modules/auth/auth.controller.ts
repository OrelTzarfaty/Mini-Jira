import type { PublicUser, RegisterInput } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import type { AuthCookie } from '../../lib/auth-cookie.js';
import type { AuthService } from './auth.service.js';

// The body type is safe because validateBody(registerSchema) runs before this handler.
type RegisterHandler = RequestHandler<Record<string, string>, PublicUser, RegisterInput>;

export interface AuthController {
  register: RegisterHandler;
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
  };
}
