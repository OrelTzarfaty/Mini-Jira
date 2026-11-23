import type { Server } from 'node:http';

import type { Express } from 'express';
import type { Logger } from 'pino';

import { registerProcessHandlers } from './lib/shutdown.js';

// Longer than the connection timeout, so a failed connection reports its own error first.
const DATABASE_CHECK_TIMEOUT_MS = 10_000;

export interface StartupDatabase {
  $queryRaw(query: TemplateStringsArray): PromiseLike<unknown>;
  $disconnect(): Promise<void>;
}

export interface StartServerOptions {
  port: number;
  app: Express;
  logger: Logger;
  database: StartupDatabase;
}

// The connection timeout ends once connected, so a database that goes quiet later needs this limit.
async function checkDatabase(database: StartupDatabase): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeLimit = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('The database did not answer in time'));
    }, DATABASE_CHECK_TIMEOUT_MS);
  });

  try {
    // A real query, because Prisma opens the connection only when it first needs it.
    await Promise.race([database.$queryRaw`SELECT 1`, timeLimit]);
  } finally {
    clearTimeout(timer);
  }
}

export async function startServer({
  port,
  app,
  logger,
  database,
}: StartServerOptions): Promise<Server> {
  try {
    await checkDatabase(database);
  } catch (error) {
    logger.fatal({ err: error }, 'The API could not connect to the database');
    process.exit(1);
  }

  const server = app.listen(port, (error) => {
    if (error) {
      logger.fatal({ err: error }, 'The API could not start');
      process.exit(1);
    }

    logger.info({ port }, 'The API is running');
  });

  registerProcessHandlers(server, () => database.$disconnect(), logger);

  return server;
}
