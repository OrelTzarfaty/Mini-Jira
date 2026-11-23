import type { Express, Router } from 'express';
import type { Logger } from 'pino';

import { createApp } from '../../src/app.js';
import { createAuthCookie } from '../../src/lib/auth-cookie.js';
import { createLogger } from '../../src/lib/logger.js';
import { createApiRouter } from '../../src/routes.js';
import { testPrisma } from './database.js';

export const TEST_CLIENT_ORIGIN = 'http://localhost:5173';

/** The secret of `testAuthCookie`, for tests that forge their own tokens. */
export const TEST_JWT_SECRET = 'test-only-jwt-secret-of-at-least-32-chars';

export const testAuthCookie = createAuthCookie({
  secret: TEST_JWT_SECRET,
  expiresIn: 7 * 24 * 60 * 60,
  nodeEnv: 'test',
});

interface TestAppOptions {
  logger?: Logger;
  apiRouter?: Router;
}

// The real API by default, on the test database. Tests that never query it don't need it running.
export function createTestApp({
  logger = createLogger('silent'),
  apiRouter = createApiRouter({ prisma: testPrisma, authCookie: testAuthCookie }),
}: TestAppOptions = {}): Express {
  return createApp({ logger, clientOrigin: TEST_CLIENT_ORIGIN, apiRouter });
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
