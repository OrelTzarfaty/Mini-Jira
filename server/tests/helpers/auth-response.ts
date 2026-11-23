import type request from 'supertest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';

// Reads the auth cookie that register and login set (AUTH-1, AUTH-2), as a browser would get it.

/** The whole `Set-Cookie` header of the auth cookie (value and attributes). */
export function findAuthCookieHeader(response: request.Response): string | undefined {
  const cookies = response.get('Set-Cookie') ?? [];

  return cookies.find((value) => value.startsWith(`${AUTH_COOKIE_NAME}=`));
}

/** The auth cookie's value: the session JWT. */
export function readAuthCookie(response: request.Response): string | undefined {
  return findAuthCookieHeader(response)
    ?.split(';')[0]
    ?.slice(AUTH_COOKIE_NAME.length + 1);
}

/** The cookie attributes after the value, e.g. `['Max-Age=604800', 'Path=/', 'HttpOnly']`. */
export function readAuthCookieAttributes(response: request.Response): string[] {
  return (findAuthCookieHeader(response) ?? '')
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim());
}

/** The JSON payload of the session JWT (readable by anyone holding the cookie). */
export function readTokenPayload(response: request.Response): Record<string, unknown> {
  const payload = (readAuthCookie(response) ?? '').split('.')[1] ?? '';

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}
