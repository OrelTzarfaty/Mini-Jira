import { loginSchema, registerSchema } from '@mini-jira/shared';
import { Router } from 'express';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthCookie } from '../../lib/auth-cookie.js';
import { validateBody } from '../../middleware/validate.js';
import { createAuthController } from './auth.controller.js';
import { createAuthService } from './auth.service.js';

export interface AuthRouterOptions {
  prisma: PrismaClient;
  authCookie: AuthCookie;
}

export function createAuthRouter({ prisma, authCookie }: AuthRouterOptions): Router {
  const router = Router();
  const controller = createAuthController(createAuthService(prisma), authCookie);

  // The app-wide origin check already blocks cross-site POSTs before they reach this route.
  router.post('/auth/register', validateBody(registerSchema), controller.register);
  router.post('/auth/login', validateBody(loginSchema), controller.login);

  return router;
}
