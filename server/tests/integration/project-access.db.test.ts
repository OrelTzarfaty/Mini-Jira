import {
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  PROJECT_OWNER_ONLY_MESSAGE,
  projectDetailSchema,
  Role,
  Status,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLoadProjectAccess,
  requireOwner,
  requireProjectAccess,
} from '../../src/middleware/project-access.js';
import { createRequireAuth } from '../../src/middleware/require-auth.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp, testAuthCookie } from '../helpers/test-app.js';
import { createTestTickets } from '../helpers/tickets.js';

const NOT_FOUND_BODY = {
  error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
};
// Headers that may differ between any two responses (they don't depend on the project).
const PER_REQUEST_HEADERS = new Set(['date', 'x-request-id']);

// Handlers on a /projects/:projectKey route.
type ProjectHandler = RequestHandler<{ projectKey: string }>;

const projectUrl = (key: string): string => `/api/projects/${key}`;

/** Every header except the per-request ones, to compare two responses. */
const stableHeaders = (response: request.Response): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(response.headers).filter(([name]) => !PER_REQUEST_HEADERS.has(name)),
  );

describe('GET /api/projects/:projectKey (PRJ-6)', () => {
  let app: ReturnType<typeof createTestApp>;
  let matrix: ProjectAccessMatrix;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const getProject = (
    caller: Parameters<typeof requestAs>[2],
    key = matrix.project.key,
  ): request.Test => requestAs(app, matrix, caller, 'get', projectUrl(key));

  it.each([
    ['owner', Role.OWNER],
    ['member', Role.MEMBER],
  ] as const)('PRJ-6: the %s gets the project (200) with role %s', async (caller, role) => {
    const response = await getProject(caller);

    expect(response.status).toBe(200);
    expect(projectDetailSchema.strict().safeParse(response.body).success).toBe(true);
    // PRJ-5: the ticket count for the delete dialog (this project has no tickets yet).
    expect(response.body).toMatchObject({ ...matrix.project, role, ticketCount: 0 });
    expect(response.text).not.toContain('ticketCounter');
  });

  it("PRJ-5, TKT-1: ticketCount counts every ticket of this project, Done ones too, and no other project's", async () => {
    await createTestTickets(matrix.project, matrix.owner.id, ['One', 'Two', 'Three']);
    await testPrisma.ticket.updateMany({
      where: { projectId: matrix.project.id, title: 'Two' },
      data: { status: Status.DONE },
    });
    const other = await createProjectsService(testPrisma).createProject(matrix.owner.id, {
      key: 'API',
      name: 'Backend',
      description: null,
    });
    await createTestTickets(other, matrix.owner.id, ['Elsewhere']);

    const response = await getProject('member');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ key: matrix.project.key, ticketCount: 3 });
  });

  it('PRJ-6: an outsider gets 404 and no project data', async () => {
    const response = await getProject('outsider');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
    for (const value of [matrix.project.id, matrix.project.name, 'The public site']) {
      expect(response.text).not.toContain(value);
    }
  });

  it("PRJ-6: an outsider's 404 is identical to a missing project's 404", async () => {
    const outsider = await getProject('outsider');
    const missing = await getProject('outsider', 'NOPE');

    expect(missing.status).toBe(404);
    expect(outsider.status).toBe(404);
    expect(outsider.text).toBe(missing.text);
    expect(stableHeaders(outsider)).toEqual(stableHeaders(missing));
  });

  it('PRJ-6: the owner gets the same 404 for a project that does not exist', async () => {
    const response = await getProject('owner', 'NOPE');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
  });

  it.each([
    ['lowercase', 'web'],
    ['mixed case', 'Web'],
    ['too short', 'W'],
    ['too long', 'WEBSITE'],
    ['with a digit', 'WEB1'],
    ['with a symbol', 'WE-B'],
  ])('PRJ-6: a %s key gets the same 404, even for the owner', async (_case, key) => {
    const response = await getProject('owner', key);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
  });

  it('PRJ-6: a visitor without a session gets 401 and no project data', async () => {
    const response = await getProject('visitor');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
    });
    expect(response.text).not.toContain(matrix.project.name);
  });

  it('PRJ-6: a member removed from the project gets 404 from then on', async () => {
    await testPrisma.projectMember.delete({
      where: { projectId_userId: { projectId: matrix.project.id, userId: matrix.member.id } },
    });

    const response = await getProject('member');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
  });
});

describe('project-access middleware (PRJ-6)', () => {
  let matrix: ProjectAccessMatrix;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const ok: ProjectHandler = (_req, res) => {
    res.status(204).end();
  };

  /** An app with one test route at /api/projects/:projectKey/test behind the given handlers. */
  const appWith = (...handlers: ProjectHandler[]): ReturnType<typeof createTestApp> => {
    const router = Router();
    router.get('/projects/:projectKey/test', ...handlers);

    return createTestApp({ apiRouter: router });
  };

  const requireAuth = createRequireAuth(testAuthCookie, createAuthService(testPrisma));
  const loadProjectAccess = (): ProjectHandler =>
    createLoadProjectAccess(createProjectsService(testPrisma));

  const testUrl = (): string => `${projectUrl(matrix.project.key)}/test`;

  it('PRJ-6: requireOwner lets the owner through', async () => {
    const app = appWith(requireAuth, loadProjectAccess(), requireOwner, ok);

    const response = await requestAs(app, matrix, 'owner', 'get', testUrl());

    expect(response.status).toBe(204);
  });

  it('PRJ-6: requireOwner gives a member 403', async () => {
    const app = appWith(requireAuth, loadProjectAccess(), requireOwner, ok);

    const response = await requestAs(app, matrix, 'member', 'get', testUrl());

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: ErrorCode.FORBIDDEN, message: PROJECT_OWNER_ONLY_MESSAGE },
    });
  });

  it('PRJ-6: on an owner-only route an outsider still gets 404, not 403', async () => {
    const app = appWith(requireAuth, loadProjectAccess(), requireOwner, ok);

    const response = await requestAs(app, matrix, 'outsider', 'get', testUrl());

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
  });

  it('PRJ-6: a key that is not a valid key gets 404 without a database query', async () => {
    const findProjectAccess = vi.fn();
    const app = appWith(requireAuth, createLoadProjectAccess({ findProjectAccess }), ok);

    const response = await requestAs(app, matrix, 'owner', 'get', `${projectUrl('web')}/test`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
    expect(findProjectAccess).not.toHaveBeenCalled();
  });

  it('PRJ-6: sets req.project and req.membership for the handlers after it', async () => {
    let seen: unknown;
    const app = appWith(requireAuth, loadProjectAccess(), (req, res) => {
      const { project, role } = requireProjectAccess(req);
      seen = { id: project.id, key: project.key, role };
      res.status(204).end();
    });

    await requestAs(app, matrix, 'member', 'get', testUrl());

    expect(seen).toEqual({ id: matrix.project.id, key: matrix.project.key, role: Role.MEMBER });
  });

  it('PRJ-6: a handler wired without loadProjectAccess fails closed (500), never serving data', async () => {
    const app = appWith(requireAuth, (req, res) => {
      res.json(requireProjectAccess(req).project);
    });

    const response = await requestAs(app, matrix, 'owner', 'get', testUrl());

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: { code: ErrorCode.INTERNAL_ERROR } });
  });
});
