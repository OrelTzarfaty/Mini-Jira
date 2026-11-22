import {
  errorResponseSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  publicUserSchema,
} from '@mini-jira/shared';
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

/** The whole `Set-Cookie` header of the auth cookie (value and attributes). */
function findAuthCookieHeader(response: request.Response): string | undefined {
  const cookies = response.get('Set-Cookie') ?? [];

  return cookies.find((value) => value.startsWith(`${AUTH_COOKIE_NAME}=`));
}

function readAuthCookie(response: request.Response): string | undefined {
  return findAuthCookieHeader(response)
    ?.split(';')[0]
    ?.slice(AUTH_COOKIE_NAME.length + 1);
}

/** The cookie attributes after the value, e.g. `['Max-Age=604800', 'Path=/', 'HttpOnly']`. */
function readAuthCookieAttributes(response: request.Response): string[] {
  return (findAuthCookieHeader(response) ?? '')
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim());
}

/** The `field` of every `details[]` entry in an error response. */
function detailFields(response: request.Response): string[] {
  return errorResponseSchema.parse(response.body).error.details?.map(({ field }) => field) ?? [];
}

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

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

  // QA (AUTH-1): success, duplicate email in any letter case, invalid email, password length.
  describe('success and validation', () => {
    it('AUTH-1: success returns exactly { id, name, email } and a 7-day HttpOnly, SameSite=Lax session cookie', async () => {
      const response = await register(NEW_USER);

      expect(response.status).toBe(201);
      expect(Object.keys(response.body as object).sort()).toEqual(['email', 'id', 'name']);
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
    });

    it('AUTH-1: the email is stored and returned trimmed and lowercase', async () => {
      const response = await register({ ...NEW_USER, email: '  Dana@MiniJira.TEST  ' });

      expect(response.status).toBe(201);
      expect(publicUserSchema.parse(response.body).email).toBe('dana@minijira.test');
      const stored = await testPrisma.user.findMany({ select: { email: true } });
      expect(stored).toEqual([{ email: 'dana@minijira.test' }]);
    });

    it.each([
      ['the same letter case', 'dana@minijira.test'],
      ['upper case', 'DANA@MINIJIRA.TEST'],
      ['mixed case with spaces', ' Dana@MiniJira.Test '],
    ])(
      'AUTH-1: a registered email in %s gets 409 EMAIL_TAKEN and no second account',
      async (_case, email) => {
        await register(NEW_USER).expect(201);

        const response = await register({ ...NEW_USER, name: 'Someone Else', email });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
          error: { code: 'EMAIL_TAKEN', message: 'This email is already registered' },
        });
        expect(readAuthCookie(response)).toBeUndefined();
        expect(await testPrisma.user.count()).toBe(1);
      },
    );

    it.each([
      ['no @', 'dana.minijira.test'],
      ['no domain', 'dana@'],
      ['no local part', '@minijira.test'],
      ['a space inside', 'dana levi@minijira.test'],
      ['only spaces', '   '],
      ['more than 254 characters', `${'a'.repeat(250)}@minijira.test`],
    ])('AUTH-1: an email with %s gets 400 with an email detail', async (_case, email) => {
      const response = await register({ ...NEW_USER, email });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(detailFields(response)).toEqual(['email']);
      expect(await testPrisma.user.count()).toBe(0);
    });

    it.each([
      ['missing', undefined, 'Email is required'],
      ['not a string', 12345, 'Invalid input: expected string, received number'],
    ])(
      'AUTH-1: an email that is %s gets 400 with an email detail',
      async (_case, email, message) => {
        const response = await register({ ...NEW_USER, email });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: { code: 'VALIDATION_ERROR', message, details: [{ field: 'email', message }] },
        });
        expect(await testPrisma.user.count()).toBe(0);
      },
    );

    it('AUTH-1: a 7-character password gets 400 with a password detail', async () => {
      const response = await register({
        ...NEW_USER,
        password: 'x'.repeat(PASSWORD_MIN_LENGTH - 1),
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
          details: [{ field: 'password', message: 'Password must be at least 8 characters' }],
        },
      });
      expect(await testPrisma.user.count()).toBe(0);
    });

    it('AUTH-1: a 129-character password gets 400 with a password detail', async () => {
      const response = await register({
        ...NEW_USER,
        password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1),
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at most 128 characters',
          details: [{ field: 'password', message: 'Password must be at most 128 characters' }],
        },
      });
      expect(await testPrisma.user.count()).toBe(0);
    });

    it.each([PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH])(
      'AUTH-1: a %i-character password is accepted (201)',
      async (length) => {
        const response = await register({ ...NEW_USER, password: 'x'.repeat(length) });

        expect(response.status).toBe(201);
        expect(await testPrisma.user.count()).toBe(1);
      },
    );
  });
});
