import { UNAUTHENTICATED_MESSAGE } from '@mini-jira/shared';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import type { AuthService } from '../../src/modules/auth/auth.service.js';
import { readAuthCookie } from '../helpers/auth-response.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createTestApp, TEST_JWT_SECRET, testAuthCookie } from '../helpers/test-app.js';

const ME_URL = '/api/auth/me';
const USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};
const UNAUTHENTICATED_BODY = {
  error: { code: 'UNAUTHENTICATED', message: UNAUTHENTICATED_MESSAGE },
};

const sessionCookie = (token: string): string => `${AUTH_COOKIE_NAME}=${token}`;

describe('GET /api/auth/me', () => {
  let app: ReturnType<typeof createTestApp>;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    ({ id: userId } = await createAuthService(testPrisma).register(USER));
    app = createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const getMe = (cookie?: string): request.Test => {
    const test = request(app).get(ME_URL);

    return cookie === undefined ? test : test.set('Cookie', cookie);
  };

  it('AUTH-4: a valid session gets 200 with exactly the public user (no password hash) and Cache-Control: no-store', async () => {
    const response = await getMe(sessionCookie(await testAuthCookie.sign(userId)));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: userId, name: USER.name, email: USER.email });
    expect(response.text).not.toContain('passwordHash');
    expect(response.text).not.toContain('$argon2');
    expect(response.get('Cache-Control')).toBe('no-store');
  });

  // The real flow: the cookie the browser got at login is sent back after a page refresh.
  it('AUTH-4: the cookie set at login restores the session with a plain GET (no Origin header)', async () => {
    const browser = request.agent(app);
    const login = await browser
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', 'same-origin')
      .send({ email: USER.email, password: USER.password });
    expect(login.status).toBe(200);
    expect(readAuthCookie(login)).toBeTruthy();

    const response = await browser.get(ME_URL);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: userId, name: USER.name, email: USER.email });
  });

  it('AUTH-4: no cookie gets 401 UNAUTHENTICATED', async () => {
    const response = await getMe();

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
  });

  it('AUTH-4: a tampered cookie gets 401 UNAUTHENTICATED', async () => {
    const token = await testAuthCookie.sign(userId);
    const [header, payload, signature = ''] = token.split('.');
    // Flips the signature's first character, so the token no longer verifies.
    const tampered = [
      header,
      payload,
      `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`,
    ];

    const response = await getMe(sessionCookie(tampered.join('.')));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
  });

  it('AUTH-4: an expired token gets 401 UNAUTHENTICATED', async () => {
    const expired = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(new TextEncoder().encode(TEST_JWT_SECRET));

    const response = await getMe(sessionCookie(expired));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
  });

  it('AUTH-4: the cookie of a user who was deleted gets 401 UNAUTHENTICATED', async () => {
    const token = await testAuthCookie.sign(userId);
    await testPrisma.user.delete({ where: { id: userId } });

    const response = await getMe(sessionCookie(token));

    expect(response.status).toBe(401);
    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
  });
});

// The race requireAuth can't cover: the user is deleted after its check but before the read.
describe('AuthService.getCurrentUser', () => {
  let authService: AuthService;

  beforeEach(async () => {
    await resetDatabase();
    authService = createAuthService(testPrisma);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('AUTH-4: returns only the public fields of an existing user', async () => {
    const { id } = await authService.register(USER);

    await expect(authService.getCurrentUser(id)).resolves.toEqual({
      id,
      name: USER.name,
      email: USER.email,
    });
  });

  it('AUTH-4: a user deleted after requireAuth passed throws 401 UNAUTHENTICATED, not 404 or 500', async () => {
    const { id } = await authService.register(USER);
    await testPrisma.user.delete({ where: { id } });

    await expect(authService.getCurrentUser(id)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
  });
});
