import {
  alreadyMemberMessage,
  ErrorCode,
  memberSchema,
  PROJECT_NOT_FOUND_MESSAGE,
  PROJECT_OWNER_ONLY_MESSAGE,
  Role,
  UNAUTHENTICATED_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
} from '@mini-jira/shared';
import type { Member } from '@mini-jira/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp, TEST_CLIENT_ORIGIN, testAuthCookie } from '../helpers/test-app.js';

const NEW_USER = { name: 'Avi Ben', email: 'avi@minijira.test' };

describe('POST /api/projects/:projectKey/members (PRJ-3)', () => {
  let app: ReturnType<typeof createTestApp>;
  let matrix: ProjectAccessMatrix;
  let newUserId: string;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
    ({ id: newUserId } = await testPrisma.user.create({
      data: { ...NEW_USER, passwordHash: 'test-only-not-a-password-hash' },
      select: { id: true },
    }));
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const membersUrl = (): string => `/api/projects/${matrix.project.key}/members`;
  const addMember = (caller: Caller, body: unknown): request.Test =>
    requestAs(app, matrix, caller, 'post', membersUrl()).send(body as object);
  const membershipOf = (userId: string): Promise<{ role: Role } | null> =>
    testPrisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: matrix.project.id, userId } },
      select: { role: true },
    });

  it('PRJ-3: the owner adds a registered user (201) as MEMBER', async () => {
    const response = await addMember('owner', { email: NEW_USER.email });

    expect(response.status).toBe(201);
    expect(memberSchema.strict().safeParse(response.body).success).toBe(true);
    expect(response.body).toMatchObject({ userId: newUserId, ...NEW_USER, role: Role.MEMBER });
    expect(response.text).not.toContain('passwordHash');
    expect(await membershipOf(newUserId)).toEqual({ role: Role.MEMBER });
  });

  it('PRJ-3: the email is trimmed and lowercased like at register', async () => {
    const response = await addMember('owner', { email: '  AVI@MiniJira.TEST ' });

    expect(response.status).toBe(201);
    expect((response.body as Member).userId).toBe(newUserId);
  });

  it('PRJ-3: the added user can now open the project as a MEMBER', async () => {
    await addMember('owner', { email: NEW_USER.email });

    const response = await request(app)
      .get(`/api/projects/${matrix.project.key}`)
      .set('Cookie', `${AUTH_COOKIE_NAME}=${await testAuthCookie.sign(newUserId)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ key: matrix.project.key, role: Role.MEMBER });
  });

  it('PRJ-3: a member (not the owner) gets 403 and nobody is added', async () => {
    const response = await addMember('member', { email: NEW_USER.email });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: ErrorCode.FORBIDDEN, message: PROJECT_OWNER_ONLY_MESSAGE },
    });
    expect(await membershipOf(newUserId)).toBeNull();
  });

  it('PRJ-3: an outsider gets 404 and nobody is added', async () => {
    const response = await addMember('outsider', { email: NEW_USER.email });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
    });
    expect(await membershipOf(newUserId)).toBeNull();
  });

  it('PRJ-3: a visitor without a session gets 401', async () => {
    const response = await addMember('visitor', { email: NEW_USER.email });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
    });
  });

  it('PRJ-3: a member sending an invalid body still gets 403, not the body rules', async () => {
    const response = await addMember('member', { email: 'not-an-email' });

    expect(response.status).toBe(403);
  });

  it('PRJ-3: an email with no Mini-Jira user gets 404 USER_NOT_FOUND on the email field', async () => {
    const response = await addMember('owner', { email: 'nobody@minijira.test' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.USER_NOT_FOUND,
        message: USER_NOT_FOUND_MESSAGE,
        details: [{ field: 'email', message: USER_NOT_FOUND_MESSAGE }],
      },
    });
  });

  it.each([
    ['an existing member', 'member@minijira.test', 'Member'],
    ['an existing member in another letter case', 'MEMBER@MiniJira.Test', 'Member'],
    ['the owner themselves', 'owner@minijira.test', 'Owner'],
  ])('PRJ-3: adding %s gets 409 ALREADY_MEMBER', async (_description, email, name) => {
    const response = await addMember('owner', { email });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.ALREADY_MEMBER,
        message: alreadyMemberMessage(name),
        details: [{ field: 'email', message: alreadyMemberMessage(name) }],
      },
    });
    // The existing role is unchanged (the owner stays OWNER).
    const userId = name === 'Owner' ? matrix.owner.id : matrix.member.id;
    expect(await membershipOf(userId)).toEqual({
      role: name === 'Owner' ? Role.OWNER : Role.MEMBER,
    });
  });

  it('PRJ-3: two adds of the same user at the same moment give one 201 and one 409', async () => {
    const responses = await Promise.all([
      addMember('owner', { email: NEW_USER.email }),
      addMember('owner', { email: NEW_USER.email }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await testPrisma.projectMember.count({ where: { userId: newUserId } })).toBe(1);
  });

  it.each([
    ['a missing email', {}, 'email'],
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    ['an unknown field', { email: NEW_USER.email, role: 'OWNER' }, 'role'],
  ])('PRJ-3: %s gets 400 VALIDATION_ERROR', async (_description, body, field) => {
    const response = await addMember('owner', body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: ErrorCode.VALIDATION_ERROR, details: [expect.objectContaining({ field })] },
    });
    expect(await membershipOf(newUserId)).toBeNull();
  });

  it('PRJ-3: a cross-site request gets 403 and nobody is added', async () => {
    const response = await request(app)
      .post(membersUrl())
      .set('Cookie', matrix.cookies.owner ?? '')
      .set('Origin', 'https://evil.example')
      .send({ email: NEW_USER.email });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: ErrorCode.FORBIDDEN } });
    expect(await membershipOf(newUserId)).toBeNull();
  });

  it('PRJ-3: the same request from the web app origin is allowed', async () => {
    const response = await request(app)
      .post(membersUrl())
      .set('Cookie', matrix.cookies.owner ?? '')
      .set('Origin', TEST_CLIENT_ORIGIN)
      .send({ email: NEW_USER.email });

    expect(response.status).toBe(201);
  });
});
