import {
  ErrorCode,
  memberPageSchema,
  PAGE_SIZE,
  PROJECT_NOT_FOUND_MESSAGE,
  Role,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { MemberPage } from '@mini-jira/shared';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';

const membersUrl = (key: string, query = ''): string => `/api/projects/${key}/members${query}`;

describe('GET /api/projects/:projectKey/members (PRJ-3)', () => {
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

  const listMembers = (caller: Caller, query = ''): request.Test =>
    requestAs(app, matrix, caller, 'get', membersUrl(matrix.project.key, query));

  it.each(['owner', 'member'] as const)(
    'PRJ-3: the %s gets the members, the owner first',
    async (caller) => {
      const response = await listMembers(caller);

      expect(response.status).toBe(200);
      expect(memberPageSchema.strict().safeParse(response.body).success).toBe(true);
      const body = response.body as MemberPage;
      expect(body).toMatchObject({ page: 1, pageSize: PAGE_SIZE, total: 2, totalPages: 1 });
      expect(
        body.items.map(({ userId, name, email, role }) => ({ userId, name, email, role })),
      ).toEqual([
        { userId: matrix.owner.id, name: 'Owner', email: matrix.owner.email, role: Role.OWNER },
        {
          userId: matrix.member.id,
          name: 'Member',
          email: matrix.member.email,
          role: Role.MEMBER,
        },
      ]);
      // Only the documented fields: never a password hash.
      expect(Object.keys(body.items[0] ?? {}).sort()).toEqual(
        ['email', 'joinedAt', 'name', 'role', 'userId'].sort(),
      );
    },
  );

  it('PRJ-3: an outsider gets 404 and no member data', async () => {
    const response = await listMembers('outsider');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
    });
  });

  it('PRJ-3: a visitor without a session gets 401', async () => {
    const response = await listMembers('visitor');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
    });
  });

  it('PRJ-3: an outsider with a bad page still gets 404, not the query rules', async () => {
    const response = await listMembers('outsider', '?page=0');

    expect(response.status).toBe(404);
  });

  it.each([
    ['zero', '?page=0'],
    ['text', '?page=abc'],
    ['an unknown parameter', '?pageSize=1000'],
  ])('LST-4: a page that is %s gets 400 VALIDATION_ERROR', async (_description, query) => {
    const response = await listMembers('member', query);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: ErrorCode.VALIDATION_ERROR } });
    expect((response.body as { error: { details: unknown[] } }).error.details.length).toBe(1);
  });

  it('PRJ-3 / LST-4: pages hold 20 members in a stable order: owner, then join time, then id', async () => {
    // 21 more members (23 in total, so 2 pages). The owner joins last, so the owner is first
    // because of the role, not the time. Pairs share a join time, so the id breaks the tie.
    const ownerJoinedAt = new Date('2026-12-31T00:00:00.000Z');
    await testPrisma.projectMember.update({
      where: { projectId_userId: { projectId: matrix.project.id, userId: matrix.owner.id } },
      data: { joinedAt: ownerJoinedAt },
    });
    await testPrisma.projectMember.update({
      where: { projectId_userId: { projectId: matrix.project.id, userId: matrix.member.id } },
      data: { joinedAt: new Date('2026-01-01T00:00:00.000Z') },
    });
    const extraUsers = await testPrisma.user.createManyAndReturn({
      data: Array.from({ length: 21 }, (_, index) => ({
        name: `Extra ${index}`,
        email: `extra${index}@minijira.test`,
        passwordHash: 'test-only-not-a-password-hash',
      })),
      select: { id: true },
    });
    const extraMembers = extraUsers.map(({ id }, index) => ({
      projectId: matrix.project.id,
      userId: id,
      role: Role.MEMBER,
      // Newest first in insert order, so the result can't just follow insert order.
      joinedAt: new Date(Date.UTC(2026, 5, 30 - Math.floor(index / 2))),
    }));
    await testPrisma.projectMember.createMany({ data: extraMembers });

    const expectedOrder = [
      matrix.owner.id,
      matrix.member.id,
      ...[...extraMembers]
        .sort(
          (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (a.userId < b.userId ? -1 : 1),
        )
        .map(({ userId }) => userId),
    ];

    const first = await listMembers('owner');
    const second = await listMembers('owner', '?page=2');
    const beyond = await listMembers('owner', '?page=3');

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ page: 1, pageSize: 20, total: 23, totalPages: 2 });
    expect(second.body).toMatchObject({ page: 2, pageSize: 20, total: 23, totalPages: 2 });
    const firstPage = first.body as MemberPage;
    const secondPage = second.body as MemberPage;
    expect(firstPage.items).toHaveLength(20);
    expect(secondPage.items).toHaveLength(3);
    expect([...firstPage.items, ...secondPage.items].map(({ userId }) => userId)).toEqual(
      expectedOrder,
    );
    expect(firstPage.items[0]?.joinedAt).toBe(ownerJoinedAt.toISOString());
    // A page after the last one is empty, not an error.
    expect(beyond.status).toBe(200);
    expect(beyond.body).toMatchObject({ items: [], page: 3, total: 23, totalPages: 2 });
  });
});
