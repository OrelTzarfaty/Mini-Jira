import { UNAUTHENTICATED_MESSAGE } from '@mini-jira/shared';
import { Router } from 'express';
import { SignJWT, UnsecuredJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_NAME, createAuthCookie } from '../../src/lib/auth-cookie.js';
import { createRequireAuth } from '../../src/middleware/require-auth.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import type { AuthService } from '../../src/modules/auth/auth.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createTestApp, TEST_JWT_SECRET, testAuthCookie } from '../helpers/test-app.js';

const USER_ID = '6f1c1f0e-3c4b-4a8e-9d4c-2f1b5e7a9c10';
const OTHER_USER_ID = '0b7e4d2a-8f3c-4e1a-9b6d-5c2f7a1e3d90';
const NEVER_REGISTERED_ID = 'c3d9a7e2-5b1f-4d8c-a6e4-9f2b7c1d3e58';
const UNAUTHENTICATED_BODY = {
  error: { code: 'UNAUTHENTICATED', message: UNAUTHENTICATED_MESSAGE },
};

const secretKey = new TextEncoder().encode(TEST_JWT_SECRET);
const nowInSeconds = (): number => Math.floor(Date.now() / 1000);
const sessionCookie = (token: string): string => `${AUTH_COOKIE_NAME}=${token}`;

/** Puts another user's ID in a real token's payload but keeps the original signature. */
function swapSubject(token: string, userId: string): string {
  const [header, payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf8')) as object;
  const forged = Buffer.from(JSON.stringify({ ...claims, sub: userId })).toString('base64url');

  return [header, forged, signature].join('.');
}

/** A test app with one route behind requireAuth; it counts how often the route ran. */
function createPrivateApp(authService: Pick<AuthService, 'userExists'>): {
  app: ReturnType<typeof createTestApp>;
  handlerCalls: () => number;
} {
  let calls = 0;
  const apiRouter = Router();
  apiRouter.get('/private', createRequireAuth(testAuthCookie, authService), (req, res) => {
    calls += 1;
    res.json({ user: req.user });
  });

  return { app: createTestApp({ apiRouter }), handlerCalls: () => calls };
}

describe('requireAuth', () => {
  let app: ReturnType<typeof createTestApp>;
  let handlerCalls: () => number;

  // No real route uses requireAuth yet (AUTH-4's GET /api/auth/me will), so a test route does.
  beforeEach(async () => {
    await resetDatabase();
    // Only the ID matters here, so the row is written directly instead of hashing a password.
    await testPrisma.user.create({
      data: { id: USER_ID, name: 'Dana Levi', email: 'dana@minijira.test', passwordHash: 'unused' },
    });
    ({ app, handlerCalls } = createPrivateApp(createAuthService(testPrisma)));
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const getPrivate = (cookie?: string): request.Test => {
    const test = request(app).get('/api/private');

    return cookie === undefined ? test : test.set('Cookie', cookie);
  };

  it('AUTH-3: a valid session cookie reaches the route with req.user = { id }', async () => {
    const token = await testAuthCookie.sign(USER_ID);

    const response = await getPrivate(sessionCookie(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: USER_ID } });
    expect(handlerCalls()).toBe(1);
  });

  it('AUTH-3: a validly signed token for a user that never existed gets 401', async () => {
    const token = await testAuthCookie.sign(NEVER_REGISTERED_ID);

    const response = await getPrivate(sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
    expect(handlerCalls()).toBe(0);
  });

  it('AUTH-3: the cookie of a user who was deleted after logging in gets 401', async () => {
    const token = await testAuthCookie.sign(USER_ID);
    await testPrisma.user.delete({ where: { id: USER_ID } });

    const response = await getPrivate(sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
    expect(handlerCalls()).toBe(0);
  });

  // Only a leaked secret could sign this; it must still be a 401, not a database error.
  it('AUTH-3: a validly signed token whose user ID is not a UUID gets 401, not 500', async () => {
    const token = await testAuthCookie.sign('not-a-uuid');

    const response = await getPrivate(sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
    expect(handlerCalls()).toBe(0);
  });

  it('AUTH-3: a database error during the user check is a 500, not a 401', async () => {
    const failing = createPrivateApp({
      userExists: () => Promise.reject(new Error('database is down')),
    });
    const token = await testAuthCookie.sign(USER_ID);

    const response = await request(failing.app)
      .get('/api/private')
      .set('Cookie', sessionCookie(token));

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
    expect(failing.handlerCalls()).toBe(0);
  });

  it('AUTH-3: no cookie gets 401 UNAUTHENTICATED', async () => {
    const response = await getPrivate();

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
    expect(handlerCalls()).toBe(0);
  });

  it('AUTH-3: a valid token in a cookie with another name gets 401', async () => {
    const token = await testAuthCookie.sign(USER_ID);

    const response = await getPrivate(`session=${token}`);

    expect(response.status).toBe(401);
    expect(handlerCalls()).toBe(0);
  });

  it.each([
    ['an empty cookie', async (): Promise<string> => Promise.resolve('')],
    ['a value that is not a JWT', async (): Promise<string> => Promise.resolve('not-a-token')],
    [
      'a JSON cookie (cookie-parser makes it an object)',
      async (): Promise<string> => Promise.resolve(`j:${JSON.stringify({ sub: USER_ID })}`),
    ],
    [
      'a token whose payload was changed to another user',
      async (): Promise<string> => swapSubject(await testAuthCookie.sign(USER_ID), OTHER_USER_ID),
    ],
    [
      'a token signed with another secret',
      async (): Promise<string> =>
        createAuthCookie({
          secret: 'another-test-secret-that-is-32-plus-chars',
          expiresIn: 60,
          nodeEnv: 'test',
        }).sign(USER_ID),
    ],
    [
      'an expired token',
      async (): Promise<string> =>
        new SignJWT()
          .setProtectedHeader({ alg: 'HS256' })
          .setSubject(USER_ID)
          .setExpirationTime(nowInSeconds() - 1)
          .sign(secretKey),
    ],
    [
      'a token signed with another algorithm (HS512)',
      async (): Promise<string> =>
        new SignJWT()
          .setProtectedHeader({ alg: 'HS512' })
          .setSubject(USER_ID)
          .setExpirationTime('1h')
          .sign(secretKey),
    ],
    [
      'an unsigned token (alg: none)',
      async (): Promise<string> =>
        Promise.resolve(new UnsecuredJWT().setSubject(USER_ID).setExpirationTime('1h').encode()),
    ],
  ])('AUTH-3: %s gets 401 UNAUTHENTICATED', async (_case, makeToken) => {
    const response = await getPrivate(sessionCookie(encodeURIComponent(await makeToken())));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
    expect(handlerCalls()).toBe(0);
  });
});
