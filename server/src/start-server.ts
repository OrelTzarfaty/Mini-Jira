import type { Server } from 'node:http';

import type { Logger } from 'pino';

import { createApp } from './app.js';
import { registerProcessHandlers } from './lib/shutdown.js';

export interface StartupDatabase {
  $queryRaw(query: TemplateStringsArray): PromiseLike<unknown>;
  $disconnect(): Promise<void>;
}

export interface StartServerOptions {
  port: number;
  clientOrigin: string;
  logger: Logger;
  database: StartupDatabase;
}

export async function startServer({
  port,
  clientOrigin,
  logger,
  database,
}: StartServerOptions): Promise<Server> {
  try {
    // A real query, because Prisma opens the connection only when it first needs it.
    await database.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.fatal({ err: error }, 'The API could not connect to the database');
    process.exit(1);
  }

  const server = createApp({ logger, clientOrigin }).listen(port, (error) => {
    if (error) {
      logger.fatal({ err: error }, 'The API could not start');
      process.exit(1);
    }

    logger.info({ port }, 'The API is running');
  });

  registerProcessHandlers(server, () => database.$disconnect(), logger);

  return server;
}
