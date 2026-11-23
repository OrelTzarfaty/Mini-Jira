import { loginSchema, registerSchema } from '@mini-jira/shared';
import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { createLoginRateLimiters } from '../../middleware/rate-limit.js';
import type { LoginRateLimits } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import { createAuthController } from './auth.controller.js';
import { createAuthService } from './auth.service.js';

export interface AuthRouterOptions {
  prisma: PrismaClient;
  authCookie: AuthCookie;
  /** Login rate limits; the architecture defaults unless a test passes smaller ones. */
  loginRateLimits?: LoginRateLimits;
}

export function createAuthRouter({
  prisma,
  authCookie,
  loginRateLimits,
}: AuthRouterOptions): Router {
  const router = Router();
  const controller = createAuthController(createAuthService(prisma), authCookie);

  // The app-wide origin check already blocks cross-site POSTs before they reach this route.
  router.post('/auth/register', validateBody(registerSchema), controller.register);
  // AUTH-2: made here, once per router, so every app starts with its own clean counters.
  // They run before validation and the password check (architecture §4.3).
  router.post(
    '/auth/login',
    createLoginRateLimiters(loginRateLimits),
    validateBody(loginSchema),
    controller.login,
  );
  // AUTH-3: public on purpose (no requireAuth), so logging out never fails with 401.
  router.post('/auth/logout', controller.logout);

  return router;
}
