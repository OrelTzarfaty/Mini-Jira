import { LOGIN_RATE_LIMITED_MESSAGE } from '@mini-jira/shared';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_LOGIN_RATE_LIMITS } from '../../src/middleware/rate-limit.js';
import type { LoginRateLimits } from '../../src/middleware/rate-limit.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createApiRouter } from '../../src/routes.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createTestApp, testAuthCookie } from '../helpers/test-app.js';

const USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};
const WRONG = { email: USER.email, password: 'wrong password' };
const RIGHT = { email: USER.email, password: USER.password };
const ONE_MINUTE_MS = 60_000;
const RATE_LIMITED_BODY = {
  error: { code: 'RATE_LIMITED', message: LOGIN_RATE_LIMITED_MESSAGE },
};

// Small limits keep the tests fast; the defaults are checked on their own below.
function createLimitedApp(perEmailAndIp: number, perIp: number): Express {
  const loginRateLimits: LoginRateLimits = {
    perEmailAndIp: { limit: perEmailAndIp, windowMs: ONE_MINUTE_MS },
    perIp: { limit: perIp, windowMs: ONE_MINUTE_MS },
  };

  return createTestApp({
    apiRouter: createApiRouter({ prisma: testPrisma, authCookie: testAuthCookie, loginRateLimits }),
  });
}

/** Sends the logins one after another and returns their status codes. */
async function loginStatuses(app: Express, bodies: object[]): Promise<number[]> {
  const statuses: number[] = [];
  for (const body of bodies) {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', 'same-origin')
      .send(body);
    statuses.push(response.status);
  }

  return statuses;
}

describe('login rate limits', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createAuthService(testPrisma).register(USER);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('AUTH-2: the defaults are 5 failed logins per email + IP in 15 minutes and 100 per IP in a day', () => {
    expect(DEFAULT_LOGIN_RATE_LIMITS).toEqual({
      perEmailAndIp: { limit: 5, windowMs: 15 * ONE_MINUTE_MS },
      perIp: { limit: 100, windowMs: 24 * 60 * ONE_MINUTE_MS },
    });
  });

  it('AUTH-2: after the email + IP limit, even the right password gets 429 with Retry-After', async () => {
    const app = createLimitedApp(2, 100);
    // Another letter case and spaces are the same email, so they share one counter.
    const failures = [WRONG, { ...WRONG, email: ' DANA@minijira.test ' }];

    expect(await loginStatuses(app, failures)).toEqual([401, 401]);
    const blocked = await request(app)
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', 'same-origin')
      .send(RIGHT);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(RATE_LIMITED_BODY);
    expect(blocked.get('Set-Cookie')).toBeUndefined();
    const retryAfter = Number(blocked.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(ONE_MINUTE_MS / 1_000);
    // Another email from the same IP has its own email + IP counter.
    expect(await loginStatuses(app, [{ ...WRONG, email: 'other@minijira.test' }])).toEqual([401]);
  });

  it('AUTH-2: successful and invalid (400) logins are not counted', async () => {
    const app = createLimitedApp(2, 2);
    const notCounted = [RIGHT, RIGHT, RIGHT, { email: USER.email }, { email: USER.email }];

    expect(await loginStatuses(app, [...notCounted, WRONG, WRONG, RIGHT])).toEqual([
      200, 200, 200, 400, 400, 401, 401, 429,
    ]);
  });

  it('AUTH-2: after the IP limit, any email from that IP gets 429', async () => {
    const app = createLimitedApp(100, 2);
    const differentEmails = ['a@minijira.test', 'b@minijira.test', USER.email].map((email) => ({
      email,
      password: 'wrong password',
    }));

    expect(await loginStatuses(app, [...differentEmails, RIGHT])).toEqual([401, 401, 429, 429]);
  });
});
