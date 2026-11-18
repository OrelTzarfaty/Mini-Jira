import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';
import { registerProcessHandlers } from './lib/shutdown.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const prisma = createPrismaClient(env.DATABASE_URL);

try {
  // A real query, because Prisma opens the connection only when it first needs it.
  await prisma.$queryRaw`SELECT 1`;
} catch (error) {
  logger.fatal({ err: error }, 'The API could not connect to the database');
  process.exit(1);
}

const server = createApp({ logger, clientOrigin: env.CLIENT_ORIGIN }).listen(env.PORT, (error) => {
  if (error) {
    logger.fatal({ err: error }, 'The API could not start');
    process.exit(1);
  }

  logger.info({ port: env.PORT }, 'The API is running');
});

registerProcessHandlers(server, () => prisma.$disconnect(), logger);
