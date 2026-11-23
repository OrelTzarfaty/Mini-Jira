import { LOGIN_RATE_LIMITED_MESSAGE } from '@mini-jira/shared';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_LOGIN_RATE_LIMITS } from '../../src/middleware/rate-limit.js';
import type { LoginRateLimits } from '../../src/middleware/rate-limit.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createApiRouter } from '../../src/routes.js';
import { readAuthCookie } from '../helpers/auth-response.js';
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
const CLIENT_IP = '203.0.113.10';
const OTHER_IP = '198.51.100.20';
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

/**
 * A login as it reaches the API through nginx: same origin (so the CSRF check passes), and
 * the client's IP in X-Forwarded-For, which the app trusts for one proxy hop.
 */
const login = (app: Express, body: object, clientIp = CLIENT_IP): request.Test =>
  request(app)
    .post('/api/auth/login')
    .set('Sec-Fetch-Site', 'same-origin')
    .set('X-Forwarded-For', clientIp)
    .send(body);

/** Sends the logins one after another and returns their status codes. */
async function loginStatuses(
  app: Express,
  bodies: object[],
  clientIp = CLIENT_IP,
): Promise<number[]> {
  const statuses: number[] = [];
  for (const body of bodies) {
    const response = await login(app, body, clientIp);
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
    const blocked = await login(app, RIGHT);

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

  // QA (AUTH-2): both limits at their real defaults, the window, races and IP spoofing.
  describe('limits at the real defaults and attacks on them', () => {
    const EMAIL_AND_IP_WINDOW_MS = 15 * ONE_MINUTE_MS;
    const IP_WINDOW_SECONDS = 24 * 60 * 60;
    /** Parallel logins per batch: enough to be fast, few enough for Argon2id's memory use. */
    const BATCH_SIZE = 10;

    /** A wrong password for a different unknown email each time, so only the IP count grows. */
    const guessesForManyEmails = (count: number): object[] =>
      Array.from({ length: count }, (_, index) => ({
        email: `guess-${String(index)}@minijira.test`,
        password: 'wrong password',
      }));

    async function expectRateLimited(
      response: request.Response,
      maxWaitSeconds: number,
    ): Promise<void> {
      expect(response.status).toBe(429);
      expect(response.body).toEqual(RATE_LIMITED_BODY);
      expect(response.get('Set-Cookie')).toBeUndefined();
      const retryAfter = Number(response.get('Retry-After'));
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(maxWaitSeconds);
      // The user row is untouched by a blocked attempt.
      await expect(testPrisma.user.count()).resolves.toBe(1);
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it('AUTH-2: at the real default, the 6th login for one email + IP gets 429 even with the right password', async () => {
      const app = createTestApp();

      expect(await loginStatuses(app, Array<object>(5).fill(WRONG))).toEqual([
        401, 401, 401, 401, 401,
      ]);
      const blocked = await login(app, RIGHT);

      await expectRateLimited(blocked, EMAIL_AND_IP_WINDOW_MS / 1_000);
    });

    it('AUTH-2: an email + IP block lets the same email in from another IP and another email from the same IP', async () => {
      const app = createTestApp();
      await loginStatuses(app, Array<object>(5).fill(WRONG));

      const otherIp = await login(app, RIGHT, OTHER_IP);
      const otherEmail = await login(app, { email: 'other@minijira.test', password: 'wrong' });

      expect(otherIp.status).toBe(200);
      expect(await testAuthCookie.verify(readAuthCookie(otherIp) ?? '')).toEqual(
        expect.any(String),
      );
      expect(otherEmail.status).toBe(401);
      expect((await login(app, RIGHT)).status).toBe(429);
    });

    it('AUTH-2: the email + IP block lasts the whole 15 minutes and ends after them', async () => {
      // Only Date is faked: the limiter reads the time from it; everything else runs normally.
      vi.useFakeTimers({ toFake: ['Date'] });
      const start = Date.now();
      const app = createTestApp();
      await loginStatuses(app, Array<object>(5).fill(WRONG));

      vi.setSystemTime(start + EMAIL_AND_IP_WINDOW_MS - 1_000);
      const lastSecond = await login(app, RIGHT);
      vi.setSystemTime(start + EMAIL_AND_IP_WINDOW_MS);
      const afterWindow = await login(app, RIGHT);

      expect(lastSecond.status).toBe(429);
      expect(lastSecond.get('Retry-After')).toBe('1');
      expect(afterWindow.status).toBe(200);
    });

    // The count goes up before the password check, so a burst can't all slip in before it.
    it('AUTH-2: 10 wrong guesses sent at once for one email get exactly 5 × 401 and 5 × 429', async () => {
      const app = createTestApp();

      const responses = await Promise.all(Array.from({ length: 10 }, () => login(app, WRONG)));

      const statuses = responses.map(({ status }) => status).sort();
      expect(statuses).toEqual([401, 401, 401, 401, 401, 429, 429, 429, 429, 429]);
    });

    // The real 100 rather than a small injected limit: it proves the shipped wiring, and with
    // batches of parallel requests it takes only a few seconds.
    it('AUTH-2: at the real default, the 101st login from one IP gets 429 for any email; other IPs are not blocked', async () => {
      const app = createTestApp();
      const guesses = guessesForManyEmails(DEFAULT_LOGIN_RATE_LIMITS.perIp.limit);

      const statuses: number[] = [];
      for (let start = 0; start < guesses.length; start += BATCH_SIZE) {
        const batch = guesses.slice(start, start + BATCH_SIZE);
        const responses = await Promise.all(batch.map((body) => login(app, body)));
        statuses.push(...responses.map(({ status }) => status));
      }
      const blocked = await login(app, RIGHT);
      const otherIp = await login(app, RIGHT, OTHER_IP);

      expect(statuses).toEqual(Array<number>(guesses.length).fill(401));
      await expectRateLimited(blocked, IP_WINDOW_SECONDS);
      expect(otherIp.status).toBe(200);
    }, 60_000);

    // A locked-out user who keeps trying must not use up the IP's budget for everyone behind
    // that address (an office, a home network).
    it('AUTH-2: blocked (429) attempts do not count toward the IP limit', async () => {
      const app = createLimitedApp(1, 3);
      const [otherEmail] = guessesForManyEmails(1);

      expect(await loginStatuses(app, [WRONG, WRONG, WRONG, RIGHT, otherEmail ?? {}])).toEqual([
        401, 429, 429, 429, 401,
      ]);
    });

    // nginx appends the real client IP to X-Forwarded-For; anything before it is the client's
    // own claim and must not create a fresh counter.
    it('AUTH-2: a made-up X-Forwarded-For entry before the proxy-added IP does not reset the IP count', async () => {
      const app = createLimitedApp(100, 2);
      const [first, second, third] = guessesForManyEmails(3);
      const spoofed = (fakeIp: string): string => `${fakeIp}, ${CLIENT_IP}`;

      const statuses = [
        (await login(app, first ?? {}, spoofed('10.0.0.1'))).status,
        (await login(app, second ?? {}, spoofed('10.0.0.2'))).status,
        (await login(app, third ?? {}, spoofed('10.0.0.3'))).status,
      ];

      expect(statuses).toEqual([401, 401, 429]);
    });

    it('AUTH-2: IPv6 addresses in one /56 network share the IP count; another /56 does not', async () => {
      const app = createLimitedApp(100, 2);
      const [first, second, third, fourth] = guessesForManyEmails(4);

      const statuses = [
        (await login(app, first ?? {}, '2001:db8:0:1::1')).status,
        (await login(app, second ?? {}, '2001:db8:0:2::2')).status,
        (await login(app, third ?? {}, '2001:db8:0:ff::3')).status,
        (await login(app, fourth ?? {}, '2001:db8:0:100::1')).status,
      ];

      expect(statuses).toEqual([401, 401, 429, 401]);
    });
  });
});
