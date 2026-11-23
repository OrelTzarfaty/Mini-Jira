import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_NAME, createAuthCookie } from '../../src/lib/auth-cookie.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createApiRouter } from '../../src/routes.js';
import {
  findAuthCookieHeader,
  readAuthCookie,
  readAuthCookieAttributes,
} from '../helpers/auth-response.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createMemoryLogger, createTestApp, TEST_JWT_SECRET } from '../helpers/test-app.js';

const LOGOUT_URL = '/api/auth/logout';
const USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};
const EXPIRED = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

/** A request as the web app sends it (same origin, so the CSRF check passes). */
const sameOrigin = (test: request.Test): request.Test => test.set('Sec-Fetch-Site', 'same-origin');

/** Logs in through the API and returns the session cookie as the browser would send it back. */
async function logIn(app = createTestApp()): Promise<string> {
  const response = await sameOrigin(request(app).post('/api/auth/login')).send({
    email: USER.email,
    password: USER.password,
  });
  expect(response.status).toBe(200);

  return `${AUTH_COOKIE_NAME}=${readAuthCookie(response) ?? ''}`;
}

const logOut = (cookie?: string, app = createTestApp()): request.Test => {
  const test = sameOrigin(request(app).post(LOGOUT_URL));

  return cookie === undefined ? test : test.set('Cookie', cookie);
};

describe('POST /api/auth/logout', () => {
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ id: userId } = await createAuthService(testPrisma).register(USER));
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('AUTH-3: a logged-in user gets 204 with no body and a Set-Cookie that removes the HttpOnly, SameSite=Lax session cookie on Path=/', async () => {
    const response = await logOut(await logIn());

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(readAuthCookie(response)).toBe('');
    const attributes = readAuthCookieAttributes(response);
    expect(attributes).toEqual(
      expect.arrayContaining(['Path=/', EXPIRED, 'HttpOnly', 'SameSite=Lax']),
    );
    // Tests run with NODE_ENV=test; the login cookie was not Secure either.
    expect(attributes).not.toContain('Secure');
  });

  it('AUTH-3: after logout the browser no longer sends the session, so a protected route gets 401', async () => {
    const browser = request.agent(createTestApp());
    await sameOrigin(browser.post('/api/auth/login')).send({
      email: USER.email,
      password: USER.password,
    });
    expect((await browser.get('/api/auth/me')).status).toBe(200);

    const response = await sameOrigin(browser.post(LOGOUT_URL));

    expect(response.status).toBe(204);
    expect((await browser.get('/api/auth/me')).status).toBe(401);
  });

  it.each([
    ['no cookie', undefined],
    ['an invalid cookie', `${AUTH_COOKIE_NAME}=not-a-token`],
    [
      'a token with a forged signature',
      `${AUTH_COOKIE_NAME}=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl`,
    ],
  ])('AUTH-3: %s still gets 204 and the cookie is cleared', async (_case, cookie) => {
    const response = await logOut(cookie);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(findAuthCookieHeader(response)).toContain(EXPIRED);
  });

  it('AUTH-3: logs "User logged out" with the user ID, never the email or the token', async () => {
    const { logger, lines } = createMemoryLogger();
    const app = createTestApp({ logger });
    const cookie = await logIn(app);

    await logOut(cookie, app);

    const logoutLines = lines.filter((line) => line.msg === 'User logged out');
    expect(logoutLines).toHaveLength(1);
    expect(logoutLines[0]).toMatchObject({ userId });
    const logs = JSON.stringify(lines);
    expect(logs).not.toContain(USER.email);
    expect(logs).not.toContain(cookie.slice(AUTH_COOKIE_NAME.length + 1));
  });

  it.each([
    ['no cookie', undefined],
    ['an invalid cookie', `${AUTH_COOKIE_NAME}=not-a-token`],
  ])('AUTH-3: with %s nothing is logged as a logout', async (_case, cookie) => {
    const { logger, lines } = createMemoryLogger();

    const response = await logOut(cookie, createTestApp({ logger }));

    expect(response.status).toBe(204);
    expect(lines.some((line) => line.msg === 'User logged out')).toBe(false);
  });

  it('AUTH-3: in production the cookie is cleared with the Secure flag it was set with', async () => {
    const productionCookie = createAuthCookie({
      secret: TEST_JWT_SECRET,
      expiresIn: 60,
      nodeEnv: 'production',
    });
    const app = createTestApp({
      apiRouter: createApiRouter({ prisma: testPrisma, authCookie: productionCookie }),
    });

    const response = await logOut(undefined, app);

    expect(response.status).toBe(204);
    expect(readAuthCookieAttributes(response)).toEqual(
      expect.arrayContaining(['Secure', 'HttpOnly', 'SameSite=Lax', 'Path=/', EXPIRED]),
    );
  });

  // Logout CSRF: another site must not be able to log the visitor out.
  it('AUTH-3: a cross-site logout gets 403 FORBIDDEN and the cookie is kept', async () => {
    const cookie = await logIn();

    const response = await request(createTestApp())
      .post(LOGOUT_URL)
      .set('Sec-Fetch-Site', 'cross-site')
      .set('Origin', 'https://evil.example')
      .set('Cookie', cookie);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'FORBIDDEN' } });
    expect(response.get('Set-Cookie')).toBeUndefined();
  });
});
