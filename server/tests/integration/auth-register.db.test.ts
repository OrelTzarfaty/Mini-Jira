import {
  errorResponseSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  publicUserSchema,
} from '@mini-jira/shared';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  readAuthCookie,
  readAuthCookieAttributes,
  readTokenPayload,
} from '../helpers/auth-response.js';
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

  it('AUTH-1: a name with a NUL character gets 400 VALIDATION_ERROR, not a database error', async () => {
    const response = await register({ ...NEW_USER, name: 'Dana\u0000Levi' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: "Name contains characters that aren't allowed",
        details: [{ field: 'name', message: "Name contains characters that aren't allowed" }],
      },
    });
    expect(await testPrisma.user.count()).toBe(0);
  });

  it('AUTH-1: a body over 100 kB gets 413 PAYLOAD_TOO_LARGE and no account', async () => {
    const response = await register({ ...NEW_USER, name: 'x'.repeat(200 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large' },
    });
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

  // QA (AUTH-1): the password is stored only as an Argon2id hash and never sent back.
  describe('password storage', () => {
    async function storedPasswordHash(email = NEW_USER.email): Promise<string> {
      const { passwordHash } = await testPrisma.user.findUniqueOrThrow({ where: { email } });

      return passwordHash;
    }

    it('AUTH-1: the stored password is an Argon2id hash that verifies only the right password', async () => {
      await register(NEW_USER).expect(201);

      const passwordHash = await storedPasswordHash();
      expect(passwordHash).toMatch(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[^$]+\$[^$]+$/);
      expect(passwordHash).not.toContain(NEW_USER.password);
      expect(await argon2.verify(passwordHash, NEW_USER.password)).toBe(true);
      expect(await argon2.verify(passwordHash, `${NEW_USER.password}!`)).toBe(false);
    });

    it('AUTH-1: two users with the same password get different (salted) hashes', async () => {
      await register(NEW_USER).expect(201);
      await register({ ...NEW_USER, email: 'noa@minijira.test' }).expect(201);

      expect(await storedPasswordHash()).not.toBe(await storedPasswordHash('noa@minijira.test'));
    });

    it('AUTH-1: neither the 201 response nor the session token contains the password or the hash', async () => {
      const response = await register(NEW_USER);

      expect(response.status).toBe(201);
      const passwordHash = await storedPasswordHash();
      const sent = `${response.text} ${JSON.stringify(response.headers)}`;
      expect(sent).not.toContain(NEW_USER.password);
      expect(sent).not.toContain(passwordHash);
      expect(sent).not.toContain('passwordHash');
      expect(Object.keys(readTokenPayload(response)).sort()).toEqual(['exp', 'iat', 'sub']);
    });

    it('AUTH-1: a 409 for a taken email contains neither password nor hash', async () => {
      await register(NEW_USER).expect(201);
      const passwordHash = await storedPasswordHash();

      const response = await register(NEW_USER);

      expect(response.status).toBe(409);
      expect(response.text).not.toContain(NEW_USER.password);
      expect(response.text).not.toContain(passwordHash);
      expect(response.text).not.toContain('passwordHash');
    });

    it.each([
      ['too short', 'secret7'],
      ['too long', 'p'.repeat(PASSWORD_MAX_LENGTH + 1)],
    ])('AUTH-1: a 400 for a %s password does not echo the password', async (_case, password) => {
      const response = await register({ ...NEW_USER, password });

      expect(response.status).toBe(400);
      expect(detailFields(response)).toEqual(['password']);
      expect(response.text).not.toContain(password);
    });
  });
});
