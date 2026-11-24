import {
  CANNOT_REMOVE_OWNER_MESSAGE,
  ErrorCode,
  INVALID_USER_ID_MESSAGE,
  MEMBER_NOT_FOUND_MESSAGE,
  PROJECT_NOT_FOUND_MESSAGE,
  PROJECT_OWNER_ONLY_MESSAGE,
  Role,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { MemberPage } from '@mini-jira/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';

// A valid UUID that belongs to no user.
const UNKNOWN_USER_ID = '0b6f2c1e-8f4a-4c3b-9a7d-2e5f1a3b4c6d';

describe('DELETE /api/projects/:projectKey/members/:userId (PRJ-4)', () => {
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

  const memberUrl = (userId: string): string =>
    `/api/projects/${matrix.project.key}/members/${userId}`;
  const removeMember = (caller: Caller, userId: string): request.Test =>
    requestAs(app, matrix, caller, 'delete', memberUrl(userId));
  const membershipOf = (
    userId: string,
    projectId = matrix.project.id,
  ): Promise<{ role: Role } | null> =>
    testPrisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

  it('PRJ-4: the owner removes a member (204, no body) and the row is gone', async () => {
    const response = await removeMember('owner', matrix.member.id);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(await membershipOf(matrix.member.id)).toBeNull();
    // Only the membership goes; the user account stays.
    expect(await testPrisma.user.count({ where: { id: matrix.member.id } })).toBe(1);
  });

  it('PRJ-4: the removed member is no longer in the members list', async () => {
    await removeMember('owner', matrix.member.id);

    const response = await requestAs(
      app,
      matrix,
      'owner',
      'get',
      `/api/projects/${matrix.project.key}/members`,
    );

    expect(response.status).toBe(200);
    const { items, total } = response.body as MemberPage;
    expect(items.map(({ userId }) => userId)).toEqual([matrix.owner.id]);
    expect(total).toBe(1);
  });

  it('PRJ-4: the removed member then gets 404 on the project', async () => {
    await removeMember('owner', matrix.member.id);

    const response = await requestAs(
      app,
      matrix,
      'member',
      'get',
      `/api/projects/${matrix.project.key}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
    });
  });

  it.each([
    ['the owner', 'owner'],
    ['themselves', 'member'],
  ] as const)(
    'PRJ-4: a member (not the owner) removing %s gets 403 and nothing is deleted',
    async (_description, target) => {
      const response = await removeMember('member', matrix[target].id);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: { code: ErrorCode.FORBIDDEN, message: PROJECT_OWNER_ONLY_MESSAGE },
      });
      expect(await membershipOf(matrix.member.id)).toEqual({ role: Role.MEMBER });
      expect(await membershipOf(matrix.owner.id)).toEqual({ role: Role.OWNER });
    },
  );

  it('PRJ-4: an outsider gets 404 and nothing is deleted', async () => {
    const response = await removeMember('outsider', matrix.member.id);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
    });
    expect(await membershipOf(matrix.member.id)).toEqual({ role: Role.MEMBER });
  });

  it('PRJ-4: a visitor without a session gets 401 and nothing is deleted', async () => {
    const response = await removeMember('visitor', matrix.member.id);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
    });
    expect(await membershipOf(matrix.member.id)).toEqual({ role: Role.MEMBER });
  });

  it('PRJ-4: the owner removing themselves gets 409 CANNOT_REMOVE_OWNER and stays owner', async () => {
    const response = await removeMember('owner', matrix.owner.id);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code: ErrorCode.CANNOT_REMOVE_OWNER, message: CANNOT_REMOVE_OWNER_MESSAGE },
    });
    expect(await membershipOf(matrix.owner.id)).toEqual({ role: Role.OWNER });
  });

  it.each([
    ['a user who is not in the project', (): string => matrix.outsider.id],
    ['a user id that belongs to nobody', (): string => UNKNOWN_USER_ID],
  ])('PRJ-4: removing %s gets 404 "Member not found"', async (_description, userId) => {
    const response = await removeMember('owner', userId());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: ErrorCode.NOT_FOUND, message: MEMBER_NOT_FOUND_MESSAGE },
    });
    expect(await testPrisma.projectMember.count()).toBe(2);
  });

  it('PRJ-4: removing the same member twice gives 204, then 404', async () => {
    expect((await removeMember('owner', matrix.member.id)).status).toBe(204);
    expect((await removeMember('owner', matrix.member.id)).status).toBe(404);
  });

  it('PRJ-4: two removes of the same member at the same moment give one 204 and one 404', async () => {
    const responses = await Promise.all([
      removeMember('owner', matrix.member.id),
      removeMember('owner', matrix.member.id),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([204, 404]);
    expect(await membershipOf(matrix.owner.id)).toEqual({ role: Role.OWNER });
  });

  it('PRJ-4: a user id that is not a UUID gets 400 VALIDATION_ERROR on userId', async () => {
    const response = await removeMember('owner', 'not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: INVALID_USER_ID_MESSAGE,
        details: [{ field: 'userId', message: INVALID_USER_ID_MESSAGE }],
      },
    });
  });

  it('PRJ-4: a member sending a bad user id still gets 403, not the parameter rules', async () => {
    const response = await removeMember('member', 'not-a-uuid');

    expect(response.status).toBe(403);
  });

  it('PRJ-4: a cross-site request gets 403 and nothing is deleted', async () => {
    const response = await request(app)
      .delete(memberUrl(matrix.member.id))
      .set('Cookie', matrix.cookies.owner ?? '')
      .set('Origin', 'https://evil.example');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: ErrorCode.FORBIDDEN } });
    expect(await membershipOf(matrix.member.id)).toEqual({ role: Role.MEMBER });
  });

  it('PRJ-4: removing a member keeps their membership in other projects', async () => {
    const other = await testPrisma.project.create({
      data: {
        key: 'API',
        name: 'API',
        members: {
          create: [
            { userId: matrix.outsider.id, role: Role.OWNER },
            { userId: matrix.member.id, role: Role.MEMBER },
          ],
        },
      },
      select: { id: true },
    });

    expect((await removeMember('owner', matrix.member.id)).status).toBe(204);

    expect(await membershipOf(matrix.member.id, other.id)).toEqual({ role: Role.MEMBER });
  });
});
