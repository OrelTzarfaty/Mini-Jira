import {
  ErrorCode,
  PAGE_SIZE,
  PROJECT_SEARCH_MAX_LENGTH,
  projectListPageSchema,
  Role,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { Express } from 'express';
import type request from 'supertest';
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

const PROJECTS_URL = '/api/projects';

// Letters only, because project keys are 2-6 letters A-Z: 0 → "AA", 1 → "AB", 26 → "BA".
const keyFor = (index: number): string =>
  String.fromCharCode(65 + Math.floor(index / 26), 65 + (index % 26));

describe('GET /api/projects (PRJ-2)', () => {
  let app: Express;
  let matrix: ProjectAccessMatrix;
  const projectsService = createProjectsService(testPrisma);

  /** Creates a project owned by `userId` through the real service (with its OWNER membership). */
  const createProject = async (userId: string, key: string, name: string): Promise<void> => {
    await projectsService.createProject(userId, { key, name, description: null });
  };

  const addMember = async (projectKey: string, userId: string): Promise<void> => {
    const { id } = await testPrisma.project.findUniqueOrThrow({ where: { key: projectKey } });
    await testPrisma.projectMember.create({ data: { projectId: id, userId, role: Role.MEMBER } });
  };

  const list = (caller: Caller, query = ''): request.Test =>
    requestAs(app, matrix, caller, 'get', `${PROJECTS_URL}${query}`);

  /** The keys on one page, in the order the API returned them. */
  const keysOf = (response: request.Response): string[] =>
    projectListPageSchema.parse(response.body).items.map(({ key }) => key);

  const searchKeys = async (caller: Caller, q: string): Promise<string[]> => {
    const response = await list(caller, `?q=${encodeURIComponent(q)}`);
    expect(response.status).toBe(200);

    return keysOf(response);
  };

  const expectValidationError = (response: request.Response, field: string): void => {
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: expect.any(String) as string,
        details: [{ field, message: expect.any(String) as string }],
      },
    });
  };

  beforeEach(async () => {
    await resetDatabase();
    // The owner created WEB ("Website") and added the member; the outsider has no project yet.
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe('only my projects, with my role and counts', () => {
    it('PRJ-2: lists the project for the owner with role OWNER and 0 open tickets', async () => {
      const response = await list('owner');

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      const page = projectListPageSchema.parse(response.body);
      expect(page).toEqual({
        items: [expect.any(Object)],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
      expect(page.items[0]).toMatchObject({
        id: matrix.project.id,
        key: 'WEB',
        name: 'Website',
        description: 'The public site',
        role: Role.OWNER,
        openTicketCount: 0,
      });
      // Internal fields never leave the API.
      expect(response.body).not.toHaveProperty('items.0.ticketCounter');
    });

    it('PRJ-2: lists the same project for a member with role MEMBER', async () => {
      const response = await list('member');

      expect(response.status).toBe(200);
      expect(projectListPageSchema.parse(response.body).items).toEqual([
        expect.objectContaining({ key: 'WEB', role: Role.MEMBER, openTicketCount: 0 }),
      ]);
    });

    it("PRJ-2: never lists another user's project; a user with no projects gets an empty list", async () => {
      await createProject(matrix.owner.id, 'API', 'Backend');

      const response = await list('outsider');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    });

    it('PRJ-2: shows each caller only their own projects, with their own role in each', async () => {
      await createProject(matrix.outsider.id, 'OUT', 'Outsider work');
      await addMember('OUT', matrix.member.id);
      await createProject(matrix.owner.id, 'API', 'Backend');

      const memberPage = projectListPageSchema.parse((await list('member')).body);
      expect(memberPage.items.map(({ key, role }) => ({ key, role }))).toEqual([
        { key: 'OUT', role: Role.MEMBER },
        { key: 'WEB', role: Role.MEMBER },
      ]);
      expect(memberPage.total).toBe(2);

      expect(keysOf(await list('outsider'))).toEqual(['OUT']);
      expect(keysOf(await list('owner'))).toEqual(['API', 'WEB']);
    });
  });

  describe('sorting and pagination', () => {
    it('PRJ-2: sorts by name, then by key when names are equal', async () => {
      await createProject(matrix.owner.id, 'ZED', 'Alpha');
      await createProject(matrix.owner.id, 'ABC', 'Alpha');
      await createProject(matrix.owner.id, 'MID', 'Mobile');

      expect(keysOf(await list('owner'))).toEqual(['ABC', 'ZED', 'MID', 'WEB']);
    });

    // Byte order would put every uppercase letter before every lowercase one ("Delta" before
    // "beta"); the list must ignore letter case on every database.
    it('PRJ-2: sorts by name ignoring letter case', async () => {
      await createProject(matrix.owner.id, 'BET', 'beta');
      await createProject(matrix.owner.id, 'ALP', 'Alpha');
      await createProject(matrix.owner.id, 'GAM', 'gamma');
      await createProject(matrix.owner.id, 'DEL', 'Delta');

      const names = projectListPageSchema
        .parse((await list('owner')).body)
        .items.map(({ name }) => name);
      expect(names).toEqual(['Alpha', 'beta', 'Delta', 'gamma', 'Website']);
    });

    it('PRJ-2: names that differ only in letter case come back in a fixed order', async () => {
      await createProject(matrix.owner.id, 'LOW', 'alpha');
      await createProject(matrix.owner.id, 'CAP', 'Alpha');
      await createProject(matrix.owner.id, 'UPP', 'ALPHA');
      await createProject(matrix.owner.id, 'TWO', 'Alpha');

      // Same name ignoring case → exact name in byte order (uppercase first) → key.
      const expected = ['UPP', 'CAP', 'TWO', 'LOW', 'WEB'];
      expect(keysOf(await list('owner'))).toEqual(expected);
      expect(keysOf(await list('owner'))).toEqual(expected);
    });

    it('LST-4: the letter-case-insensitive order holds across page 1 and page 2', async () => {
      // 21 more projects + WEB = 22, alternating lowercase and uppercase names.
      for (let index = 0; index < PAGE_SIZE + 1; index += 1) {
        const name = `${index % 2 === 0 ? 'item' : 'ITEM'} ${String(index).padStart(2, '0')}`;
        await createProject(matrix.owner.id, keyFor(index), name);
      }
      // A lowercase name that must land on page 2, after "ITEM 19"/"item 20" and before "Website".
      await createProject(matrix.owner.id, 'ZZ', 'unit');

      const first = projectListPageSchema.parse((await list('owner')).body);
      const second = projectListPageSchema.parse((await list('owner', '?page=2')).body);
      expect(first.total).toBe(23);
      expect(first.items.map(({ name }) => name)).toEqual(
        Array.from(
          { length: PAGE_SIZE },
          (_unused, index) =>
            `${index % 2 === 0 ? 'item' : 'ITEM'} ${String(index).padStart(2, '0')}`,
        ),
      );
      expect(second.items.map(({ name }) => name)).toEqual(['item 20', 'unit', 'Website']);
    });

    it('LST-4: returns 20 projects per page, the rest on page 2, and nothing past the end', async () => {
      // 21 more projects + WEB = 22. Names sort before "Website".
      for (let index = 0; index < PAGE_SIZE + 1; index += 1) {
        await createProject(
          matrix.owner.id,
          keyFor(index),
          `Project ${String(index).padStart(2, '0')}`,
        );
      }

      const first = projectListPageSchema.parse((await list('owner')).body);
      expect(first).toMatchObject({ page: 1, pageSize: 20, total: 22, totalPages: 2 });
      expect(first.items).toHaveLength(PAGE_SIZE);
      expect(first.items[0]?.name).toBe('Project 00');

      const secondResponse = await list('owner', '?page=2');
      const second = projectListPageSchema.parse(secondResponse.body);
      expect(second).toMatchObject({ page: 2, pageSize: 20, total: 22, totalPages: 2 });
      expect(second.items.map(({ key }) => key)).toEqual([keyFor(PAGE_SIZE), 'WEB']);

      // No project shows on both pages.
      const firstKeys = new Set(first.items.map(({ key }) => key));
      expect(second.items.some(({ key }) => firstKeys.has(key))).toBe(false);

      const pastEnd = await list('owner', '?page=3');
      expect(pastEnd.status).toBe(200);
      expect(pastEnd.body).toEqual({ items: [], page: 3, pageSize: 20, total: 22, totalPages: 2 });
    });
  });

  describe('search (q)', () => {
    beforeEach(async () => {
      await createProject(matrix.owner.id, 'API', 'Backend services');
      await createProject(matrix.owner.id, 'MOB', 'Mobile app');
    });

    it('PRJ-2: finds projects by part of the name, in any letter case', async () => {
      expect(await searchKeys('owner', 'BACKEND')).toEqual(['API']);
      expect(await searchKeys('owner', 'site')).toEqual(['WEB']);
    });

    it('PRJ-2: finds projects by part of the key, in any letter case', async () => {
      expect(await searchKeys('owner', 'mo')).toEqual(['MOB']);
      expect(await searchKeys('owner', 'Ap')).toEqual(['API', 'MOB']); // key API, name "Mobile app"
    });

    it('PRJ-2: trims the search, and treats an empty search as no search', async () => {
      expect(await searchKeys('owner', '  backend  ')).toEqual(['API']);
      expect(await searchKeys('owner', '   ')).toEqual(['API', 'MOB', 'WEB']);
    });

    it('PRJ-2: treats % and _ as plain characters, not wildcards', async () => {
      await createProject(matrix.owner.id, 'PCT', '100% done');
      await createProject(matrix.owner.id, 'SNK', 'snake_case');

      expect(await searchKeys('owner', '%')).toEqual(['PCT']);
      expect(await searchKeys('owner', '_')).toEqual(['SNK']);
      // As wildcards, "a_p" would match "Mobile app" and "b%s" "Backend services".
      expect(await searchKeys('owner', 'a_p')).toEqual([]);
      expect(await searchKeys('owner', 'b%s')).toEqual([]);
    });

    it('PRJ-2: treats a backslash as a plain character', async () => {
      await createProject(matrix.owner.id, 'BSL', 'path\\to');

      expect(await searchKeys('owner', '\\')).toEqual(['BSL']);
      expect(await searchKeys('owner', 'h\\t')).toEqual(['BSL']);
      // Unescaped, the backslash would escape the "p" away and match "path\to".
      expect(await searchKeys('owner', '\\p')).toEqual([]);
    });

    it("PRJ-2: never finds another user's project", async () => {
      await createProject(matrix.outsider.id, 'SEC', 'Secret plans');

      expect(await searchKeys('owner', 'secret')).toEqual([]);
      expect(await searchKeys('outsider', 'secret')).toEqual(['SEC']);
    });

    it('PRJ-2: paginates the search results with the matching total', async () => {
      const response = await list('owner', '?q=ce&page=1');

      expect(projectListPageSchema.parse(response.body)).toMatchObject({
        page: 1,
        total: 1,
        totalPages: 1,
      });
      expect(keysOf(response)).toEqual(['API']);
    });
  });

  describe('failures', () => {
    it('PRJ-2: without a session cookie it is 401 and no data', async () => {
      const response = await list('visitor');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
    });

    it('PRJ-2: a visitor gets 401 even with an invalid query (auth is checked first)', async () => {
      expect((await list('visitor', '?page=0')).status).toBe(401);
    });

    it.each([
      ['zero', '?page=0'],
      ['text', '?page=abc'],
      ['a repeated page', '?page=1&page=2'],
    ])('LST-4: an invalid page (%s) is 400', async (_description, query) => {
      expectValidationError(await list('owner', query), 'page');
    });

    it('LST-4: an unknown query parameter is 400', async () => {
      const response = await list('owner', '?pageSize=1000');

      expectValidationError(response, 'pageSize');
      expect(response.body).toHaveProperty('error.details.0.message', 'Unknown field');
    });

    it(`PRJ-2: a search over ${PROJECT_SEARCH_MAX_LENGTH} characters is 400`, async () => {
      const response = await list('owner', `?q=${'a'.repeat(PROJECT_SEARCH_MAX_LENGTH + 1)}`);

      expectValidationError(response, 'q');
      expect(response.body).toHaveProperty(
        'error.message',
        `Search must be at most ${PROJECT_SEARCH_MAX_LENGTH} characters`,
      );
    });

    it('PRJ-2: a repeated search or one with a control character is 400, not 500', async () => {
      expectValidationError(await list('owner', '?q=a&q=b'), 'q');
      expectValidationError(await list('owner', '?q=a%00b'), 'q');
    });
  });
});
