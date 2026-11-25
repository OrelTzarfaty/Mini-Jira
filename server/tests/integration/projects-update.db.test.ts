import {
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  PROJECT_OWNER_ONLY_MESSAGE,
  PROJECT_UPDATE_EMPTY_MESSAGE,
  projectDetailSchema,
  Role,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { ProjectDetail } from '@mini-jira/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';
import { createTestTickets } from '../helpers/tickets.js';

describe('PATCH /api/projects/:projectKey (PRJ-5)', () => {
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

  const projectUrl = (): string => `/api/projects/${matrix.project.key}`;
  const updateProject = (caller: Caller, body: object): request.Test =>
    requestAs(app, matrix, caller, 'patch', projectUrl()).send(body);
  const storedProject = (): Promise<{ key: string; name: string; description: string | null }> =>
    testPrisma.project.findUniqueOrThrow({
      where: { id: matrix.project.id },
      select: { key: true, name: true, description: true },
    });
  // The project as the matrix created it, to check that a rejected request changed nothing.
  const original = (): { key: string; name: string; description: string | null } => ({
    key: matrix.project.key,
    name: matrix.project.name,
    description: matrix.project.description,
  });

  it('PRJ-5, TKT-1: the PATCH response counts the project tickets', async () => {
    await createTestTickets(matrix.project, matrix.owner.id, ['One', 'Two']);

    const response = await updateProject('owner', { name: 'Website 2' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Website 2', ticketCount: 2 });
  });

  it('PRJ-5: the owner edits the name and description (200, same shape as GET)', async () => {
    const response = await updateProject('owner', {
      name: '  Website 2  ',
      description: '  New text  ',
    });

    expect(response.status).toBe(200);
    expect(projectDetailSchema.strict().safeParse(response.body).success).toBe(true);
    expect(response.body).toMatchObject({
      id: matrix.project.id,
      key: matrix.project.key,
      name: 'Website 2',
      description: 'New text',
      role: Role.OWNER,
      ticketCount: 0,
    });
    expect(response.text).not.toContain('ticketCounter');
    expect(await storedProject()).toEqual({
      key: matrix.project.key,
      name: 'Website 2',
      description: 'New text',
    });
  });

  it('PRJ-5: GET returns the edited project afterwards', async () => {
    const updated = (await updateProject('owner', { name: 'Renamed' })).body as ProjectDetail;
    const response = await requestAs(app, matrix, 'owner', 'get', projectUrl());

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updated);
  });

  it('PRJ-5: a field that is not sent stays as it is', async () => {
    const response = await updateProject('owner', { name: 'Renamed' });

    expect(response.status).toBe(200);
    expect(await storedProject()).toEqual({ ...original(), name: 'Renamed' });
  });

  it.each([null, '', '   '])('PRJ-5: a description of %j clears it (null)', async (value) => {
    const response = await updateProject('owner', { description: value });

    expect(response.status).toBe(200);
    expect((response.body as ProjectDetail).description).toBeNull();
    expect(await storedProject()).toEqual({ ...original(), description: null });
  });

  it('PRJ-5: the key in the body is rejected (400) and nothing changes', async () => {
    const response = await updateProject('owner', { name: 'Renamed', key: 'NEW' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Unknown field',
        details: [{ field: 'key', message: 'Unknown field' }],
      },
    });
    // Not even the name sent with it is saved.
    expect(await storedProject()).toEqual(original());
  });

  it('PRJ-5: an empty body is rejected (400) with a message for the whole body', async () => {
    const response = await updateProject('owner', {});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: ErrorCode.VALIDATION_ERROR, message: PROJECT_UPDATE_EMPTY_MESSAGE },
    });
  });

  it.each([
    ['blank', '   ', 'Name is required'],
    ['too long', 'a'.repeat(101), 'Name must be at most 100 characters'],
    ['control-character', 'bad\u0000name', "Name contains characters that aren't allowed"],
  ])('PRJ-5: a %s name is rejected (400) on the name field', async (_case, name, message) => {
    const response = await updateProject('owner', { name });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: ErrorCode.VALIDATION_ERROR, message, details: [{ field: 'name', message }] },
    });
    expect(await storedProject()).toEqual(original());
  });

  it('PRJ-5: a member gets 403 and the project is unchanged', async () => {
    const response = await updateProject('member', { name: 'Hijacked' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: ErrorCode.FORBIDDEN, message: PROJECT_OWNER_ONLY_MESSAGE },
    });
    expect(await storedProject()).toEqual(original());
  });

  it('PRJ-5: an outsider gets 404 and no project data, even with an invalid body', async () => {
    // The access checks run before validation, so an outsider never learns the body rules.
    const response = await updateProject('outsider', { key: 'NEW' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
    });
    expect(await storedProject()).toEqual(original());
  });

  it('PRJ-5: a visitor gets 401', async () => {
    const response = await updateProject('visitor', { name: 'Renamed' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
    });
    expect(await storedProject()).toEqual(original());
  });

  it('PRJ-5: a cross-site request from the owner gets 403 and changes nothing', async () => {
    const response = await request(app)
      .patch(projectUrl())
      .set('Cookie', matrix.cookies.owner ?? '')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ name: 'Renamed' });

    expect(response.status).toBe(403);
    expect(await storedProject()).toEqual(original());
  });

  it('PRJ-5: the service gets 404 when the project was deleted after the access check', async () => {
    const service = createProjectsService(testPrisma);
    const access = await service.findProjectAccess(matrix.owner.id, matrix.project.key);
    if (!access) throw new Error('The owner must have access');
    await testPrisma.project.delete({ where: { id: matrix.project.id } });

    await expect(service.updateProject(access, { name: 'Renamed' })).rejects.toMatchObject({
      status: 404,
      code: ErrorCode.NOT_FOUND,
    });
  });
});
