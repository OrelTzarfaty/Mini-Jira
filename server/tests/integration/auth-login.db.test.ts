import { INVALID_CREDENTIALS_MESSAGE, publicUserSchema } from '@mini-jira/shared';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthCookie } from '../../src/lib/auth-cookie.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createApiRouter } from '../../src/routes.js';
import {
  readAuthCookie,
  readAuthCookieAttributes,
  readTokenPayload,
} from '../helpers/auth-response.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createMemoryLogger, createTestApp, testAuthCookie } from '../helpers/test-app.js';

const LOGIN_URL = '/api/auth/login';
const USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};
const INVALID_CREDENTIALS_BODY = {
  error: { code: 'INVALID_CREDENTIALS', message: INVALID_CREDENTIALS_MESSAGE },
};

/** A login request as the web app sends it (same origin, so the CSRF check passes). */
const login = (body: object, app = createTestApp()): request.Test =>
  request(app).post(LOGIN_URL).set('Sec-Fetch-Site', 'same-origin').send(body);

describe('POST /api/auth/login', () => {
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ id: userId } = await createAuthService(testPrisma).register(USER));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('AUTH-2: the right email and password return 200 with the public user and set the auth cookie', async () => {
    const response = await login({ email: ' Dana@MiniJira.TEST ', password: USER.password });

    expect(response.status).toBe(200);
    expect(publicUserSchema.strict().parse(response.body)).toEqual({
      id: userId,
      name: USER.name,
      email: USER.email,
    });
    expect(await testAuthCookie.verify(readAuthCookie(response) ?? '')).toBe(userId);
  });

  it('AUTH-2: a wrong password gets the generic 401 and no cookie', async () => {
    const response = await login({ email: USER.email, password: 'wrong password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(INVALID_CREDENTIALS_BODY);
    expect(readAuthCookie(response)).toBeUndefined();
  });

  it('AUTH-2: an unknown email gets the same 401 and still runs an Argon2id verify', async () => {
    const verify = vi.spyOn(argon2, 'verify');

    const response = await login({ email: 'nobody@minijira.test', password: USER.password });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(INVALID_CREDENTIALS_BODY);
    expect(readAuthCookie(response)).toBeUndefined();
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('AUTH-2: invalid input gets 400 VALIDATION_ERROR', async () => {
    const response = await login({ email: USER.email });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: [{ field: 'password' }] },
    });
  });

  it('AUTH-2: logs the user ID on success and no email or password on success or failure', async () => {
    const { logger, lines } = createMemoryLogger();
    const app = createTestApp({ logger });

    await login({ email: USER.email, password: 'wrong password' }, app);
    const failureLogs = JSON.stringify(lines);
    await login({ email: USER.email, password: USER.password }, app);
    const allLogs = JSON.stringify(lines);

    expect(failureLogs).not.toContain(userId);
    expect(allLogs).toContain(userId);
    expect(allLogs).not.toContain(USER.email);
    expect(allLogs).not.toContain(USER.password);
  });

  // QA (AUTH-2): one generic error, the session cookie's flags, and no hash in any answer.
  describe('generic error, cookie flags and no hash', () => {
    const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
    /** Headers that differ on every response by design (the clock and the request ID). */
    const PER_REQUEST_HEADERS = ['date', 'x-request-id'];

    /** Status, body and headers of a response, without the per-request headers. */
    function describeAnswer(response: request.Response): object {
      const headers = Object.fromEntries(
        Object.entries(response.headers).filter(([name]) => !PER_REQUEST_HEADERS.includes(name)),
      );

      return { status: response.status, body: response.body as unknown, headers };
    }

    async function storedPasswordHash(): Promise<string> {
      const { passwordHash } = await testPrisma.user.findUniqueOrThrow({ where: { id: userId } });

      return passwordHash;
    }

    // The answers must be byte-for-byte alike, or an attacker can tell which emails have accounts.
    it('AUTH-2: an unknown email gets exactly the same status, body and headers as a wrong password', async () => {
      const wrongPassword = await login({ email: USER.email, password: 'wrong password' });
      const unknownEmail = await login({
        email: 'nobody@minijira.test',
        password: 'wrong password',
      });

      expect(wrongPassword.body).toEqual(INVALID_CREDENTIALS_BODY);
      expect(describeAnswer(unknownEmail)).toEqual(describeAnswer(wrongPassword));
    });

    it.each([
      [
        'the right password in another letter case',
        { email: USER.email, password: USER.password.toUpperCase() },
      ],
      [
        'the right password with a trailing space',
        { email: USER.email, password: `${USER.password} ` },
      ],
      [
        "another account's right password",
        { email: USER.email, password: 'other account password' },
      ],
    ])('AUTH-2: %s gets the generic 401 and no cookie', async (_case, body) => {
      await createAuthService(testPrisma).register({
        name: 'Noa Cohen',
        email: 'noa@minijira.test',
        password: 'other account password',
      });

      const response = await login(body);

      expect(response.status).toBe(401);
      expect(response.body).toEqual(INVALID_CREDENTIALS_BODY);
      expect(response.get('Set-Cookie')).toBeUndefined();
    });

    it('AUTH-2: success sets a 7-day HttpOnly, SameSite=Lax session cookie on Path=/, not Secure outside production', async () => {
      const response = await login({ email: USER.email, password: USER.password });

      expect(response.status).toBe(200);
      const attributes = readAuthCookieAttributes(response);
      expect(attributes).toEqual(
        expect.arrayContaining([
          `Max-Age=${String(SEVEN_DAYS_IN_SECONDS)}`,
          'Path=/',
          'HttpOnly',
          'SameSite=Lax',
        ]),
      );
      // Tests run with NODE_ENV=test; a Secure cookie would never reach http://localhost.
      expect(attributes).not.toContain('Secure');
      // No Domain: the cookie goes back only to the host that set it.
      expect(attributes.some((attribute) => attribute.startsWith('Domain='))).toBe(false);
    });

    it('AUTH-2: in production the login cookie is also Secure (HTTPS only)', async () => {
      const productionCookie = createAuthCookie({
        secret: 'test-only-jwt-secret-of-at-least-32-chars',
        expiresIn: SEVEN_DAYS_IN_SECONDS,
        nodeEnv: 'production',
      });
      const app = createTestApp({
        apiRouter: createApiRouter({ prisma: testPrisma, authCookie: productionCookie }),
      });

      const response = await login({ email: USER.email, password: USER.password }, app);

      expect(response.status).toBe(200);
      expect(readAuthCookieAttributes(response)).toEqual(
        expect.arrayContaining(['Secure', 'HttpOnly', 'SameSite=Lax']),
      );
    });

    it.each([
      [401, 'a wrong password', { email: USER.email, password: 'wrong password' }],
      [401, 'an unknown email', { email: 'nobody@minijira.test', password: USER.password }],
      [400, 'a missing password', { email: USER.email }],
      [400, 'an extra field', { email: USER.email, password: USER.password, id: 'someone-else' }],
      [400, 'a non-string email', { email: 42, password: USER.password }],
    ])('AUTH-2: a %i for %s sets no cookie at all', async (status, _case, body) => {
      const response = await login(body);

      expect(response.status).toBe(status);
      expect(response.get('Set-Cookie')).toBeUndefined();
    });

    // Login CSRF: another site must not be able to log the visitor in to the attacker's account.
    it('AUTH-2: a cross-site login with the right password gets 403 FORBIDDEN and no cookie', async () => {
      const response = await request(createTestApp())
        .post(LOGIN_URL)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .send({ email: USER.email, password: USER.password });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: { code: 'FORBIDDEN' } });
      expect(response.get('Set-Cookie')).toBeUndefined();
    });

    it('AUTH-2: neither the 200 nor the 401 (body, headers or token) contains the password or the hash', async () => {
      const passwordHash = await storedPasswordHash();

      const success = await login({ email: USER.email, password: USER.password });
      const failure = await login({ email: USER.email, password: 'wrong password' });

      expect(success.status).toBe(200);
      expect(failure.status).toBe(401);
      for (const response of [success, failure]) {
        const sent = `${response.text} ${JSON.stringify(response.headers)}`;
        expect(sent).not.toContain(USER.password);
        expect(sent).not.toContain(passwordHash);
        expect(sent).not.toContain('passwordHash');
      }
      expect(Object.keys(readTokenPayload(success)).sort()).toEqual(['exp', 'iat', 'sub']);
    });

    it('AUTH-2: a login changes nothing in the user row', async () => {
      const before = await testPrisma.user.findUniqueOrThrow({ where: { id: userId } });

      await login({ email: USER.email, password: USER.password }).expect(200);
      await login({ email: USER.email, password: 'wrong password' }).expect(401);

      expect(await testPrisma.user.findUniqueOrThrow({ where: { id: userId } })).toEqual(before);
    });
  });
});
