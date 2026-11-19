import { loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';
import { startServer } from './start-server.js';

const env = loadEnv();

await startServer({
  port: env.PORT,
  clientOrigin: env.CLIENT_ORIGIN,
  logger: createLogger(env.LOG_LEVEL),
  database: createPrismaClient(env.DATABASE_URL),
});
