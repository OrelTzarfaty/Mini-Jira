import { createHmac } from 'node:crypto';

import type { BrowserContext, Cookie } from '@playwright/test';

import { AUTH_COOKIE_NAME } from './auth-api.js';
import { E2E_JWT_SECRET } from './e2e-stack.js';

// Broken versions of a real session cookie, to check that the API turns them away (AUTH-4).
// The cookie holds a JWT signed with HS256 (server/src/lib/auth-cookie.ts).

const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1_000;

async function findSessionCookie(context: BrowserContext): Promise<Cookie> {
  const cookie = (await context.cookies()).find(({ name }) => name === AUTH_COOKIE_NAME);
  if (!cookie) {
    throw new Error(`The context has no ${AUTH_COOKIE_NAME} cookie to change`);
  }

  return cookie;
}

/** Overwrites the cookie: same name, domain, and path, with another value. */
async function replaceSessionToken(context: BrowserContext, token: string): Promise<void> {
  const cookie = await findSessionCookie(context);
  await context.addCookies([{ ...cookie, value: token }]);
}

function splitToken(token: string): [header: string, payload: string, signature: string] {
  const [header, payload, signature] = token.split('.');
  if (header === undefined || payload === undefined || signature === undefined) {
    throw new Error('The session cookie is not a JWT');
  }

  return [header, payload, signature];
}

function signHs256(headerAndPayload: string): string {
  return createHmac('sha256', E2E_JWT_SECRET).update(headerAndPayload).digest('base64url');
}

/**
 * Changes one character in the middle of the signature (a middle character carries all its
 * bits, unlike the last one), as an attacker editing the cookie would break it.
 */
export async function tamperWithSessionToken(context: BrowserContext): Promise<void> {
  const [header, payload, signature] = splitToken((await findSessionCookie(context)).value);
  const middle = Math.floor(signature.length / 2);
  const changed = signature[middle] === 'A' ? 'B' : 'A';
  const tamperedSignature = `${signature.slice(0, middle)}${changed}${signature.slice(middle + 1)}`;

  await replaceSessionToken(context, `${header}.${payload}.${tamperedSignature}`);
}

/**
 * Replaces the token with a correctly signed copy for the same user that expired a minute ago,
 * so only the expiry can be the reason the API refuses it.
 */
export async function expireSessionToken(context: BrowserContext): Promise<void> {
  const [header, payload] = splitToken((await findSessionCookie(context)).value);
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as object;
  const now = Math.floor(Date.now() / MS_PER_SECOND);
  const expiredPayload = Buffer.from(
    JSON.stringify({
      ...claims,
      iat: now - 2 * SECONDS_PER_MINUTE,
      exp: now - SECONDS_PER_MINUTE,
    }),
  ).toString('base64url');
  const headerAndPayload = `${header}.${expiredPayload}`;

  await replaceSessionToken(context, `${headerAndPayload}.${signHs256(headerAndPayload)}`);
}
