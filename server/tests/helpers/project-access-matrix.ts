import { Role } from '@mini-jira/shared';
import type { Express } from 'express';
import request from 'supertest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { testPrisma } from './database.js';
import { testAuthCookie } from './test-app.js';

/**
 * PRJ-6: the authorization matrix that every project route is tested against (architecture §6).
 *
 * - `owner`    — created the project (role OWNER)
 * - `member`   — added to the project (role MEMBER)
 * - `outsider` — logged in, but not a member: must get 404 and no project data
 * - `visitor`  — not logged in (no cookie): must get 401
 *
 * How a later story uses it (e.g. PRJ-3 `POST /api/projects/:projectKey/members`):
 *
 * ```ts
 * beforeEach(async () => {
 *   await resetDatabase();
 *   matrix = await createProjectAccessMatrix();
 *   app = createTestApp();
 * });
 *
 * it.each([
 *   ['owner', 201], ['member', 403], ['outsider', 404], ['visitor', 401],
 * ] as const)('PRJ-3: %s gets %i', async (caller, status) => {
 *   const response = await requestAs(app, matrix, caller, 'post', `/api/projects/${matrix.project.key}/members`)
 *     .send({ email: 'new@minijira.test' });
 *   expect(response.status).toBe(status);
 * });
 * ```
 *
 * Call it after `resetDatabase()`. The users are inserted directly (no Argon2 hashing, so it is
 * fast) and can't log in with a password; tests authenticate with a signed session cookie instead.
 */

export const CALLERS = ['owner', 'member', 'outsider', 'visitor'] as const;
export type Caller = (typeof CALLERS)[number];

export interface MatrixUser {
  id: string;
  name: string;
  email: string;
}

export interface ProjectAccessMatrix {
  /** The project, created through the real service (so the owner's membership is real too). */
  project: { id: string; key: string; name: string; description: string | null };
  owner: MatrixUser;
  member: MatrixUser;
  outsider: MatrixUser;
  /** The `Cookie` header for each caller; undefined for the visitor. */
  cookies: Readonly<Record<Caller, string | undefined>>;
}

interface MatrixOptions {
  key?: string;
  name?: string;
  description?: string | null;
}

// Not a real Argon2 hash: matrix users never log in with a password.
const UNUSABLE_PASSWORD_HASH = 'test-only-not-a-password-hash';

async function createUser(name: string): Promise<MatrixUser> {
  const email = `${name.toLowerCase()}@minijira.test`;

  return testPrisma.user.create({
    data: { name, email, passwordHash: UNUSABLE_PASSWORD_HASH },
    select: { id: true, name: true, email: true },
  });
}

async function cookieFor(userId: string): Promise<string> {
  return `${AUTH_COOKIE_NAME}=${await testAuthCookie.sign(userId)}`;
}

/** Creates the project, its owner and member, and an outsider, with a session cookie for each. */
export async function createProjectAccessMatrix({
  key = 'WEB',
  name = 'Website',
  description = 'The public site',
}: MatrixOptions = {}): Promise<ProjectAccessMatrix> {
  const owner = await createUser('Owner');
  const member = await createUser('Member');
  const outsider = await createUser('Outsider');

  const created = await createProjectsService(testPrisma).createProject(owner.id, {
    key,
    name,
    description,
  });
  // Inserted directly: faster than the PRJ-3 endpoint, and independent of it.
  await testPrisma.projectMember.create({
    data: { projectId: created.id, userId: member.id, role: Role.MEMBER },
  });

  return {
    project: {
      id: created.id,
      key: created.key,
      name: created.name,
      description: created.description,
    },
    owner,
    member,
    outsider,
    cookies: {
      owner: await cookieFor(owner.id),
      member: await cookieFor(member.id),
      outsider: await cookieFor(outsider.id),
      visitor: undefined,
    },
  };
}

type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

/**
 * A request to `path` as `caller`: with their session cookie (none for the visitor) and the
 * same-origin header the web app sends, so state-changing requests pass the origin check.
 * Returns the supertest request, so the test can still add `.send(body)` before awaiting it.
 */
export function requestAs(
  app: Express,
  matrix: ProjectAccessMatrix,
  caller: Caller,
  method: HttpMethod,
  path: string,
): request.Test {
  const test = request(app)[method](path).set('Sec-Fetch-Site', 'same-origin');
  const cookie = matrix.cookies[caller];

  return cookie === undefined ? test : test.set('Cookie', cookie);
}
