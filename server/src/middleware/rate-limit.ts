import { ErrorCode, LOGIN_RATE_LIMITED_MESSAGE, loginSchema } from '@mini-jira/shared';
import type { Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Options } from 'express-rate-limit';

import { AppError } from '../lib/errors.js';

const MINUTE_MS = 60 * 1_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MS_PER_SECOND = 1_000;
const INVALID_CREDENTIALS_STATUS = 401;

export interface RateLimitRule {
  /** Failed logins allowed in one window; the next attempt gets 429. */
  limit: number;
  windowMs: number;
}

export interface LoginRateLimits {
  perEmailAndIp: RateLimitRule;
  perIp: RateLimitRule;
}

// AUTH-2 (architecture §7): 5 failed logins per email + IP in 15 minutes stops guessing one
// account's password; 100 per IP in a day stops one address trying many accounts.
export const DEFAULT_LOGIN_RATE_LIMITS: LoginRateLimits = {
  perEmailAndIp: { limit: 5, windowMs: 15 * MINUTE_MS },
  perIp: { limit: 100, windowMs: DAY_MS },
};

/**
 * The login email, normalized by the same shared rule as the login schema (trim, lowercase),
 * so "Ana@x.com" and " ana@x.com" share one counter. `undefined` when the body has no valid
 * email: that request gets 400 from validation and can never reach the password check.
 */
function readLoginEmail(req: Request): string | undefined {
  const body: unknown = req.body;
  if (typeof body !== 'object' || body === null || !('email' in body)) {
    return undefined;
  }
  const result = loginSchema.shape.email.safeParse(body.email);

  return result.success ? result.data : undefined;
}

// The library keeps its count on req.rateLimit but doesn't add it to Express's Request type.
function readResetTime(req: Request): Date | undefined {
  if (!('rateLimit' in req)) {
    return undefined;
  }
  const info: unknown = req.rateLimit;
  if (typeof info !== 'object' || info === null || !('resetTime' in info)) {
    return undefined;
  }

  return info.resetTime instanceof Date ? info.resetTime : undefined;
}

// Counts only failed logins: express-rate-limit counts every request first (so a burst of
// parallel guesses is still limited), then takes back each one whose answer wasn't 401
// INVALID_CREDENTIALS (success, 400, and the 429 itself). On the login route a 401 can only
// mean wrong credentials: the origin check answers 403 and validation 400.
const wasNotFailedLogin = (_req: Request, res: Response): boolean =>
  res.statusCode !== INVALID_CREDENTIALS_STATUS;

function createLimiter(
  { limit, windowMs }: RateLimitRule,
  keyOptions: Pick<Partial<Options>, 'keyGenerator' | 'skip'>,
): RequestHandler {
  return rateLimit({
    limit,
    windowMs,
    ...keyOptions,
    skipSuccessfulRequests: true,
    requestWasSuccessful: wasNotFailedLogin,
    // No RateLimit-* headers: they are set before the count is taken back, so a successful
    // login would show one attempt fewer than is left. The 429 sets Retry-After itself.
    standardHeaders: false,
    legacyHeaders: false,
    handler(req, res, next) {
      const resetTime = readResetTime(req);
      // Without a reset time, the whole window is the safe (longest) answer.
      const waitMs = resetTime ? resetTime.getTime() - Date.now() : windowMs;
      res.setHeader('Retry-After', String(Math.max(0, Math.ceil(waitMs / MS_PER_SECOND))));
      next(new AppError(ErrorCode.RATE_LIMITED, LOGIN_RATE_LIMITED_MESSAGE));
    },
  });
}

/**
 * AUTH-2: the two login limiters, per IP then per email + IP. They run before validation and
 * the password check, so a blocked key gets 429 even with the right password.
 *
 * Each call makes new limiters with their own in-memory store, so every app (and every test
 * app) starts with clean counters. Memory is enough while one API instance runs; several
 * instances would need a shared store such as Redis.
 */
export function createLoginRateLimiters(
  limits: LoginRateLimits = DEFAULT_LOGIN_RATE_LIMITS,
): RequestHandler[] {
  return [
    // The library's default key: the client IP (an IPv6 address counts by its /56 network, so
    // changing addresses inside one network doesn't reset the count).
    createLimiter(limits.perIp, {}),
    createLimiter(limits.perEmailAndIp, {
      skip: (req) => readLoginEmail(req) === undefined,
      keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${readLoginEmail(req) ?? ''}`,
    }),
  ];
}
