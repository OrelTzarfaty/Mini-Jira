import type { CookieOptions, Request, Response } from 'express';
import { errors, jwtVerify, SignJWT } from 'jose';

import type { Env } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'mj_session';

// Pinned on both sign and verify, so a token can never choose its own algorithm ("alg: none",
// or an algorithm that would treat the secret differently).
const JWT_ALGORITHM = 'HS256';
const MS_PER_SECOND = 1_000;

export interface AuthCookieConfig {
  secret: Env['JWT_SECRET'];
  /** Token and cookie lifetime in seconds. */
  expiresIn: Env['JWT_EXPIRES_IN'];
  nodeEnv: Env['NODE_ENV'];
}

export interface AuthCookie {
  /** Signs a JWT `{ sub: userId }` that expires after the configured lifetime. */
  sign(userId: string): Promise<string>;
  /** Returns the user ID of a valid, unexpired token, or `undefined` for any invalid token. */
  verify(token: string): Promise<string | undefined>;
  /** Returns the user ID from the request's auth cookie, or `undefined` if it is missing or invalid. */
  readUserId(req: Pick<Request, 'cookies'>): Promise<string | undefined>;
  /** Signs a token for the user and sets it as the auth cookie (logs the user in). */
  set(res: Pick<Response, 'cookie'>, userId: string): Promise<void>;
  /** Removes the auth cookie (logs the user out). */
  clear(res: Pick<Response, 'clearCookie'>): void;
}

// AUTH-1: the session is a signed JWT in an HTTP-only cookie (architecture §7).
export function createAuthCookie({ secret, expiresIn, nodeEnv }: AuthCookieConfig): AuthCookie {
  const key = new TextEncoder().encode(secret);
  // JavaScript can't read the cookie (httpOnly), other sites' requests don't send it
  // (sameSite lax), and in production it travels only over HTTPS (secure).
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
  };

  const sign = (userId: string): Promise<string> =>
    new SignJWT()
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${String(expiresIn)}s`)
      .sign(key);

  const verify = async (token: string): Promise<string | undefined> => {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: [JWT_ALGORITHM],
        // jose checks "exp" only when it is present, so require it: no token lives forever.
        requiredClaims: ['exp', 'sub'],
      });

      // jose accepts any JSON value in "sub" (a number, for example), so check the type here.
      return typeof payload.sub === 'string' ? payload.sub : undefined;
    } catch (error) {
      // A bad token is the client's problem (fail closed); anything else is a bug.
      if (error instanceof errors.JOSEError) {
        return undefined;
      }
      throw error;
    }
  };

  return {
    sign,
    verify,
    readUserId(req) {
      // cookie-parser turns a "j:{...}" cookie into an object, so the value may not be a string.
      const token: unknown = req.cookies[AUTH_COOKIE_NAME];

      return typeof token === 'string' ? verify(token) : Promise.resolve(undefined);
    },
    async set(res, userId) {
      // Same lifetime as the token, so the browser drops the cookie when the token expires.
      res.cookie(AUTH_COOKIE_NAME, await sign(userId), {
        ...cookieOptions,
        maxAge: expiresIn * MS_PER_SECOND,
      });
    },
    clear(res) {
      // The browser removes the cookie only when the name and path match the ones it was set with.
      res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
    },
  };
}
