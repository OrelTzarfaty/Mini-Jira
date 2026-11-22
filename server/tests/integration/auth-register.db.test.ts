import { publicUserSchema } from '@mini-jira/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createMemoryLogger, createTestApp, testAuthCookie } from '../helpers/test-app.js';

const REGISTER_URL = '/api/auth/register';
const NEW_USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};

/** A register request as the web app sends it (same origin, so the CSRF check passes). */
const register = (body: object, app = createTestApp()): request.Test =>
  request(app).post(REGISTER_URL).set('Sec-Fetch-Site', 'same-origin').send(body);

function readAuthCookie(response: request.Response): string | undefined {
  const cookies = response.get('Set-Cookie') ?? [];
  const cookie = cookies.find((value) => value.startsWith(`${AUTH_COOKIE_NAME}=`));

  return cookie?.split(';')[0]?.slice(AUTH_COOKIE_NAME.length + 1);
}

describe('POST /api/auth/register', () => {
  beforeEach(resetDatabase);

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('AUTH-1: creates the account, logs the user in and returns 201 with the public user', async () => {
    const response = await register(NEW_USER);

    expect(response.status).toBe(201);
    const user = publicUserSchema.strict().parse(response.body);
    expect(user).toMatchObject({ name: NEW_USER.name, email: NEW_USER.email });
    const token = readAuthCookie(response) ?? '';
    expect(await testAuthCookie.verify(token)).toBe(user.id);
    const stored = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.email).toBe(NEW_USER.email);
  });

  it('AUTH-1: invalid input gets 400 VALIDATION_ERROR with one detail per field and no account', async () => {
    const response = await register({ name: '', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required',
        details: [
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Enter a valid email address' },
          { field: 'password', message: 'Password must be at least 8 characters' },
        ],
      },
    });
    expect(readAuthCookie(response)).toBeUndefined();
    expect(await testPrisma.user.count()).toBe(0);
  });

  it('AUTH-1: an unknown field gets 400 and is named in details', async () => {
    const response = await register({ ...NEW_USER, role: 'admin' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Unknown field',
        details: [{ field: 'role', message: 'Unknown field' }],
      },
    });
    expect(await testPrisma.user.count()).toBe(0);
  });

  it('AUTH-1: a cross-site request gets 403 and creates no account', async () => {
    const response = await request(createTestApp())
      .post(REGISTER_URL)
      .set('Sec-Fetch-Site', 'cross-site')
      .send(NEW_USER);

    expect(response.status).toBe(403);
    expect(await testPrisma.user.count()).toBe(0);
  });

  it('AUTH-1: logs the new user ID but never the email, password or token', async () => {
    const { logger, lines } = createMemoryLogger();

    const response = await register(NEW_USER, createTestApp({ logger }));

    const logs = JSON.stringify(lines);
    const user = publicUserSchema.parse(response.body);
    expect(logs).toContain(user.id);
    expect(logs).not.toContain(NEW_USER.email);
    expect(logs).not.toContain(NEW_USER.password);
    expect(logs).not.toContain(readAuthCookie(response) ?? 'missing cookie');
  });
});
