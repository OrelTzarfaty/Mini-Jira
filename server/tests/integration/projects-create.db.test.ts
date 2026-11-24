import { ErrorCode, PROJECT_KEY_TAKEN_MESSAGE, projectSchema, Role } from '@mini-jira/shared';
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import { createTestApp, testAuthCookie } from '../helpers/test-app.js';

const PROJECTS_URL = '/api/projects';
const USER = {
  name: 'Dana Levi',
  email: 'dana@minijira.test',
  password: 'correct horse battery staple',
};
const OTHER_USER = {
  name: 'Omer Cohen',
  email: 'omer@minijira.test',
  password: 'another long passphrase',
};
const VALID_PROJECT = { name: 'Website', key: 'WEB', description: 'The public site' };
const KEY_FORMAT_MESSAGE = 'Key must be 2–6 letters (A–Z)';
const KEY_TAKEN_BODY = {
  error: {
    code: ErrorCode.PROJECT_KEY_TAKEN,
    message: PROJECT_KEY_TAKEN_MESSAGE,
    details: [{ field: 'key', message: PROJECT_KEY_TAKEN_MESSAGE }],
  },
};

describe('POST /api/projects', () => {
  let app: ReturnType<typeof createTestApp>;
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    await resetDatabase();
    const authService = createAuthService(testPrisma);
    ({ id: userId } = await authService.register(USER));
    ({ id: otherUserId } = await authService.register(OTHER_USER));
    app = createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const createProject = async (
    body: unknown,
    // null sends no session cookie.
    asUserId: string | null = userId,
  ): Promise<request.Response> => {
    const test = request(app).post(PROJECTS_URL).set('Sec-Fetch-Site', 'same-origin');
    if (asUserId !== null) {
      test.set('Cookie', `${AUTH_COOKIE_NAME}=${await testAuthCookie.sign(asUserId)}`);
    }

    return test.send(body as object);
  };

  const keyDetail = (response: request.Response): unknown =>
    (response.body as { error: { details?: { field: string }[] } }).error.details?.find(
      ({ field }) => field === 'key',
    );

  it('PRJ-1: creates the project (201) with the caller as OWNER, a membership row and ticketCounter 0', async () => {
    const response = await createProject(VALID_PROJECT);

    expect(response.status).toBe(201);
    expect(projectSchema.strict().safeParse(response.body).success).toBe(true);
    expect(response.body).toMatchObject({ ...VALID_PROJECT, role: Role.OWNER });
    expect(response.text).not.toContain('ticketCounter');

    const { id } = response.body as { id: string };
    const stored = await testPrisma.project.findUniqueOrThrow({
      where: { id },
      include: { members: true },
    });
    expect(stored.key).toBe('WEB');
    expect(stored.ticketCounter).toBe(0);
    expect(stored.members).toEqual([
      expect.objectContaining({ projectId: id, userId, role: Role.OWNER }),
    ]);
  });

  it('PRJ-1: trims the input, uppercases a lowercase key and stores an empty description as null', async () => {
    const response = await createProject({ name: '  Website  ', key: ' web ', description: '   ' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Website', key: 'WEB', description: null });
    expect(await testPrisma.project.findUnique({ where: { key: 'WEB' } })).toMatchObject({
      name: 'Website',
      description: null,
    });
  });

  it('PRJ-1: a missing description is stored as null', async () => {
    const response = await createProject({ name: 'Website', key: 'WEB' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ description: null });
  });

  it.each([
    ['one letter', 'W', KEY_FORMAT_MESSAGE],
    ['seven letters', 'WEBSITE', KEY_FORMAT_MESSAGE],
    ['digits', 'WEB1', KEY_FORMAT_MESSAGE],
    ['a space inside', 'WE B', KEY_FORMAT_MESSAGE],
    ['an accented letter', 'WÉB', KEY_FORMAT_MESSAGE],
    ['a non-English letter that uppercases to A-Z', 'ßß', KEY_FORMAT_MESSAGE],
    ['only spaces', '   ', 'Key is required'],
  ])(
    'PRJ-1: a key with %s gets 400 VALIDATION_ERROR on the key field',
    async (_case, key, message) => {
      const response = await createProject({ ...VALID_PROJECT, key });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: { code: ErrorCode.VALIDATION_ERROR } });
      expect(keyDetail(response)).toEqual({ field: 'key', message });
      expect(await testPrisma.project.count()).toBe(0);
    },
  );

  it('PRJ-1: a missing key and name get 400 with one detail per field', async () => {
    const response = await createProject({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Name is required',
        details: [
          { field: 'name', message: 'Name is required' },
          { field: 'key', message: 'Key is required' },
        ],
      },
    });
  });

  it('PRJ-1: an unknown field (e.g. ticketCounter) gets 400 and nothing is stored', async () => {
    const response = await createProject({ ...VALID_PROJECT, ticketCounter: 99 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        details: [{ field: 'ticketCounter', message: 'Unknown field' }],
      },
    });
    expect(await testPrisma.project.count()).toBe(0);
  });

  it('PRJ-1: a key already used by another project gets 409 PROJECT_KEY_TAKEN on the key field', async () => {
    expect((await createProject(VALID_PROJECT)).status).toBe(201);

    const response = await createProject({ ...VALID_PROJECT, name: 'Other' }, otherUserId);

    expect(response.status).toBe(409);
    expect(response.body).toEqual(KEY_TAKEN_BODY);
  });

  it('PRJ-1: the same key in another letter case is also taken (409)', async () => {
    expect((await createProject(VALID_PROJECT)).status).toBe(201);

    const response = await createProject({ ...VALID_PROJECT, key: 'Web' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual(KEY_TAKEN_BODY);
  });

  // The unique index, not a read-then-write check, decides: one create wins, the other gets 409,
  // and the loser leaves no project or membership behind.
  it('PRJ-1: two creates with the same key at the same moment give one 201 and one 409', async () => {
    const responses = await Promise.all([
      createProject(VALID_PROJECT, userId),
      createProject(VALID_PROJECT, otherUserId),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await testPrisma.project.count()).toBe(1);
    expect(await testPrisma.projectMember.count()).toBe(1);
  });

  it('PRJ-1: without a session cookie gets 401 UNAUTHENTICATED and nothing is stored', async () => {
    const response = await createProject(VALID_PROJECT, null);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: ErrorCode.UNAUTHENTICATED } });
    expect(await testPrisma.project.count()).toBe(0);
  });

  it('PRJ-1: a cross-site request gets 403 FORBIDDEN and nothing is stored', async () => {
    const response = await request(app)
      .post(PROJECTS_URL)
      .set('Sec-Fetch-Site', 'cross-site')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${await testAuthCookie.sign(userId)}`)
      .send(VALID_PROJECT);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: ErrorCode.FORBIDDEN } });
    expect(await testPrisma.project.count()).toBe(0);
  });

  // One transaction: a membership that can't be written (here: an unknown user, so the foreign
  // key fails) also undoes the project, so a project never exists without its owner.
  it('PRJ-1: when the owner membership fails, the project is rolled back too', async () => {
    const service = createProjectsService(testPrisma);

    await expect(
      service.createProject(randomUUID(), { ...VALID_PROJECT, description: null }),
    ).rejects.toThrow();

    expect(await testPrisma.project.count()).toBe(0);
  });

  // Defence in depth: the CHECK constraints refuse bad rows that skip the API's validation.
  it('PRJ-1: the database refuses a lowercase key and a negative ticketCounter', async () => {
    await expect(
      testPrisma.project.create({ data: { key: 'web', name: 'Website' } }),
    ).rejects.toThrow();
    await expect(
      testPrisma.project.create({ data: { key: 'WEB', name: 'Website', ticketCounter: -1 } }),
    ).rejects.toThrow();
  });

  it('PRJ-1: deleting the project removes its memberships (cascade)', async () => {
    const { id } = (await createProject(VALID_PROJECT)).body as { id: string };

    await testPrisma.project.delete({ where: { id } });

    expect(await testPrisma.projectMember.count()).toBe(0);
  });
});
