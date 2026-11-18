import type { Express, Router } from 'express';
import type { Logger } from 'pino';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/lib/logger.js';

export const TEST_CLIENT_ORIGIN = 'http://localhost:5173';

interface TestAppOptions {
  logger?: Logger;
  apiRouter?: Router;
}

export function createTestApp({
  logger = createLogger('silent'),
  apiRouter,
}: TestAppOptions = {}): Express {
  return createApp({
    logger,
    clientOrigin: TEST_CLIENT_ORIGIN,
    ...(apiRouter ? { apiRouter } : {}),
  });
}

export interface LogLine {
  level: number;
  msg: string;
  req?: { id: string; method: string; url: string; headers?: unknown };
  res?: { statusCode: number };
  err?: { message: string; stack: string };
}

export function createMemoryLogger(): { logger: Logger; lines: LogLine[] } {
  const lines: LogLine[] = [];
  const logger = createLogger('info', {
    write: (line: string) => {
      lines.push(JSON.parse(line) as LogLine);
    },
  });
  return { logger, lines };
}
