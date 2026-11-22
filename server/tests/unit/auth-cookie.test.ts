import express from 'express';
import { decodeJwt, SignJWT, UnsecuredJWT } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { Env } from '../../src/config/env.js';
import { AUTH_COOKIE_NAME, createAuthCookie } from '../../src/lib/auth-cookie.js';
import type { AuthCookieConfig } from '../../src/lib/auth-cookie.js';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';
const OTHER_SECRET = 'another-unit-test-secret-of-32-plus-chars';
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
const USER_ID = '6f1c1f0e-3c4b-4a8e-9d4c-2f1b5e7a9c10';

const CONFIG: AuthCookieConfig = {
  secret: SECRET,
  expiresIn: SEVEN_DAYS_IN_SECONDS,
  nodeEnv: 'development',
};

const encode = (secret: string): Uint8Array => new TextEncoder().encode(secret);
const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

/** Returns the Set-Cookie header a real Express response sends for `set` or `clear`. */
async function getSetCookieHeader(
  nodeEnv: Env['NODE_ENV'],
  action: 'set' | 'clear',
): Promise<string> {
  const authCookie = createAuthCookie({ ...CONFIG, nodeEnv });
  const app = express();
  app.get('/', async (_req, res) => {
    if (action === 'set') {
      await authCookie.set(res, USER_ID);
    } else {
      authCookie.clear(res);
    }
    res.end();
  });

  const response = await request(app).get('/');
  const [header] = response.get('Set-Cookie') ?? [];

  return header ?? '';
}

describe('auth cookie: JWT', () => {
  it('AUTH-1: a signed token verifies back to the same user ID', async () => {
    const authCookie = createAuthCookie(CONFIG);

    const token = await authCookie.sign(USER_ID);

    expect(await authCookie.verify(token)).toBe(USER_ID);
  });

  it('AUTH-1: the token holds only the user ID and expires after the configured lifetime', async () => {
    const token = await createAuthCookie(CONFIG).sign(USER_ID);

    const { sub, iat, exp, ...rest } = decodeJwt(token);
    expect(sub).toBe(USER_ID);
    expect(rest).toEqual({});
    expect((exp ?? 0) - (iat ?? 0)).toBe(SEVEN_DAYS_IN_SECONDS);
  });

  it('AUTH-1: rejects a token signed with another secret', async () => {
    const token = await createAuthCookie({ ...CONFIG, secret: OTHER_SECRET }).sign(USER_ID);

    expect(await createAuthCookie(CONFIG).verify(token)).toBeUndefined();
  });

  it.each(['HS384', 'HS512'])('AUTH-1: rejects a token signed with %s', async (alg) => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg })
      .setSubject(USER_ID)
      .setExpirationTime('1h')
      .sign(encode(SECRET));

    expect(await createAuthCookie(CONFIG).verify(token)).toBeUndefined();
  });

  it('AUTH-1: rejects an unsigned token (alg: none)', async () => {
    const token = new UnsecuredJWT().setSubject(USER_ID).setExpirationTime('1h').encode();

    expect(await createAuthCookie(CONFIG).verify(token)).toBeUndefined();
  });

  it('AUTH-1: rejects an expired token', async () => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setExpirationTime(nowInSeconds() - 1)
      .sign(encode(SECRET));

    expect(await createAuthCookie(CONFIG).verify(token)).toBeUndefined();
  });

  it('AUTH-1: rejects a token without an expiry', async () => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .sign(encode(SECRET));

    expect(await createAuthCookie(CONFIG).verify(token)).toBeUndefined();
  });

  it('AUTH-1: rejects a token whose subject is not a string', async () => {
    const numericSubject: Record<string, unknown> = { sub: 42 };
    const token = await new SignJWT(numericSubject)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(encode(SECRET));

    expect(await createAuthCookie(CONFIG).verify(token)).toBeUndefined();
  });

  it('AUTH-1: rejects a value that is not a JWT', async () => {
    expect(await createAuthCookie(CONFIG).verify('not-a-token')).toBeUndefined();
  });
});

describe('auth cookie: cookie', () => {
  it('AUTH-1: sets an HTTP-only, SameSite=Lax cookie that lasts as long as the token', async () => {
    const header = await getSetCookieHeader('development', 'set');
    const token = /^mj_session=([^;]+);/.exec(header)?.[1] ?? '';

    expect(header.startsWith(`${AUTH_COOKIE_NAME}=`)).toBe(true);
    expect(header).toContain(`Max-Age=${String(SEVEN_DAYS_IN_SECONDS)}`);
    expect(header).toContain('Path=/');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(await createAuthCookie(CONFIG).verify(token)).toBe(USER_ID);
  });

  it.each(['development', 'test'] as const)(
    'AUTH-1: the cookie is not Secure when NODE_ENV is %s',
    async (nodeEnv) => {
      expect(await getSetCookieHeader(nodeEnv, 'set')).not.toContain('Secure');
    },
  );

  it('AUTH-1: the cookie is Secure in production', async () => {
    expect(await getSetCookieHeader('production', 'set')).toContain('Secure');
  });

  it('AUTH-1: clearing empties the cookie on the same path with an expiry in the past', async () => {
    const header = await getSetCookieHeader('production', 'clear');

    expect(header).toMatch(/^mj_session=;/);
    expect(header).toContain('Path=/');
    expect(header).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Secure');
  });
});
