import { randomUUID } from 'node:crypto';

import { request } from '@playwright/test';
import type { APIRequestContext, BrowserContext } from '@playwright/test';

import { E2E_BASE_URL } from './e2e-stack.js';

// Logs users in (and creates new ones) straight through the API, without the UI: much faster
// than filling the forms, and it leaves the UI tests to the auth specs themselves.

/** The login cookie the API sets (server/src/lib/auth-cookie.ts). */
export const AUTH_COOKIE_NAME = 'mj_session';

/** The demo password of every seed account (server/prisma/seed.ts). Public on purpose. */
export const SEED_PASSWORD = 'MiniJira-demo-2026';

/** The seed accounts that global-setup adds before every run (server/prisma/seed.ts). */
export const SEED_USERS = {
  owner: { name: 'Olivia Owner', email: 'owner@minijira.test' },
  member: { name: 'Max Member', email: 'member@minijira.test' },
  outsider: { name: 'Omar Outsider', email: 'outsider@minijira.test' },
} as const;

export type SeedRole = keyof typeof SEED_USERS;

/** Cookies (and local storage) a browser context can start with: a logged-in session. */
export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

export interface Credentials {
  email: string;
  password: string;
}

/**
 * The API as the web app calls it. The Origin header makes the request same-origin for the
 * API's CSRF check (server/src/middleware/origin-check.ts), which rejects any other caller.
 */
function newApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: { Origin: E2E_BASE_URL },
  });
}

/** Sends one auth request and returns the session it got, or fails with the API's answer. */
async function postForSession(path: string, body: object, email: string): Promise<StorageState> {
  const api = await newApiContext();
  try {
    const response = await api.post(path, { data: body });
    if (!response.ok()) {
      throw new Error(
        `${path} for ${email} failed: ${String(response.status())} ${await response.text()}`,
      );
    }
    const user = (await response.json()) as { email?: unknown };
    if (user.email !== email) {
      throw new Error(`${path} for ${email} returned another user: ${String(user.email)}`);
    }

    return await api.storageState();
  } finally {
    await api.dispose();
  }
}

/**
 * Logs in with `POST /api/auth/login` and returns the session (the HTTP-only auth cookie).
 * Only failed logins count toward the login rate limits, so this can run as often as needed.
 */
export function loginThroughApi({ email, password }: Credentials): Promise<StorageState> {
  return postForSession('/api/auth/login', { email, password }, email);
}

/** A new account with a unique email, created with `POST /api/auth/register`. */
export async function registerThroughApi(): Promise<Credentials & { session: StorageState }> {
  const credentials = {
    email: `e2e-${randomUUID()}@minijira.test`,
    password: 'E2E-user-pass-1',
  };
  const session = await postForSession(
    '/api/auth/register',
    { name: 'Erin E2E', ...credentials },
    credentials.email,
  );

  return { ...credentials, session };
}

/**
 * Logs the browser context in as a new account with its own session (register logs the user in).
 * - Not the shared worker session of the fixtures (`loginAs`): a test that logs out or breaks
 *   its cookie must never end a session that other tests use.
 * - Not a fresh login of a seed account: the login rate limiter counts each login while it is
 *   in flight, so several parallel logins of one account can get 429 even with the right
 *   password, and the test would be flaky.
 */
export async function logInAsNewUser(context: BrowserContext): Promise<Credentials> {
  const { session, ...credentials } = await registerThroughApi();
  await context.addCookies(session.cookies);

  return credentials;
}
