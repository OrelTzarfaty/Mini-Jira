import { INVALID_CREDENTIALS_MESSAGE, publicUserSchema } from '@mini-jira/shared';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
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

function readAuthCookie(response: request.Response): string | undefined {
  return (response.get('Set-Cookie') ?? [])
    .find((value) => value.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.split(';')[0]
    ?.slice(AUTH_COOKIE_NAME.length + 1);
}

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
});
