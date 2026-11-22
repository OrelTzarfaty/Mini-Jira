import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createAuthCookie } from './lib/auth-cookie.js';
import { createLogger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';
import { createApiRouter } from './routes.js';
import { startServer } from './start-server.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const prisma = createPrismaClient(env.DATABASE_URL);
const authCookie = createAuthCookie({
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  nodeEnv: env.NODE_ENV,
});

await startServer({
  port: env.PORT,
  app: createApp({
    logger,
    clientOrigin: env.CLIENT_ORIGIN,
    apiRouter: createApiRouter({ prisma, authCookie }),
  }),
  logger,
  database: prisma,
});
