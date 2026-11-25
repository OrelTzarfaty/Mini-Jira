import {
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  Role,
  Status,
  ticketSchema,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import type { Express } from 'express';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTicketsService } from '../../src/modules/tickets/tickets.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';

// Byte order, the order PostgreSQL uses for the rank column (COLLATE "C").
const byteOrder = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

describe('POST /api/projects/:projectKey/tickets (TKT-1)', () => {
  let app: Express;
  let matrix: ProjectAccessMatrix;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const ticketsUrl = (projectKey = matrix.project.key): string =>
    `/api/projects/${projectKey}/tickets`;
  const createTicket = (caller: Caller, body: unknown, url = ticketsUrl()): request.Test =>
    requestAs(app, matrix, caller, 'post', url).send(body as object);
  const ticketCount = (): Promise<number> =>
    testPrisma.ticket.count({ where: { projectId: matrix.project.id } });
  const ticketCounter = async (): Promise<number> =>
    (await testPrisma.project.findUniqueOrThrow({ where: { id: matrix.project.id } }))
      .ticketCounter;

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

  describe('main path', () => {
    it('TKT-1: a member creates a ticket (201) in To Do with the first key and defaults', async () => {
      const response = await createTicket('member', { title: '  Fix the login page  ' });

      expect(response.status).toBe(201);
      // strict(): the response has exactly the documented fields (no rank, no ids of rows).
      const ticket = ticketSchema.strict().parse(response.body);
      expect(ticket).toEqual({
        id: expect.any(String) as string,
        key: 'WEB-1',
        number: 1,
        title: 'Fix the login page',
        description: null,
        type: 'TASK',
        priority: 'MEDIUM',
        status: Status.TODO,
        reporter: { id: matrix.member.id, name: matrix.member.name },
        assignee: null,
        dueDate: null,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });

      const stored = await testPrisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(stored).toMatchObject({
        projectId: matrix.project.id,
        number: 1,
        status: Status.TODO,
        reporterId: matrix.member.id,
        assigneeId: null,
      });
      expect(await ticketCounter()).toBe(1);
    });

    it('TKT-1: the owner creates a ticket with every field', async () => {
      const response = await createTicket('owner', {
        title: 'Crash on save',
        description: 'Steps:\n1. Open a ticket\n2. Save',
        type: 'BUG',
        priority: 'CRITICAL',
        dueDate: '2026-12-31',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        key: 'WEB-1',
        title: 'Crash on save',
        description: 'Steps:\n1. Open a ticket\n2. Save',
        type: 'BUG',
        priority: 'CRITICAL',
        status: Status.TODO,
        reporter: { id: matrix.owner.id, name: matrix.owner.name },
        // The calendar day comes back unchanged (stored as a DATE, no time zone shift).
        dueDate: '2026-12-31',
      });
    });

    it('TKT-1: keys follow the project counter one by one', async () => {
      const keys: string[] = [];
      for (const title of ['First', 'Second', 'Third']) {
        const response = await createTicket('member', { title });
        keys.push((response.body as Ticket).key);
      }

      expect(keys).toEqual(['WEB-1', 'WEB-2', 'WEB-3']);
    });

    it('TKT-1: numbers are counted per project', async () => {
      // A second project with the same owner.
      await testPrisma.project.create({
        data: {
          key: 'API',
          name: 'Backend',
          members: { create: { userId: matrix.owner.id, role: Role.OWNER } },
        },
      });

      await createTicket('owner', { title: 'Web ticket' });
      const response = await createTicket('owner', { title: 'Api ticket' }, ticketsUrl('API'));

      expect((response.body as Ticket).key).toBe('API-1');
    });

    it('TKT-1: a new ticket goes to the bottom of To Do, after the existing To Do tickets', async () => {
      // Existing cards. Their ranks sort differently in byte order ("Zz" < "a5" < "aZ") and in a
      // language collation ("a5" < "aZ" < "Zz"), so the test also checks the COLLATE "C" column.
      await testPrisma.ticket.createMany({
        data: [
          { rank: 'a5', number: 1, title: 'Top' },
          { rank: 'Zz', number: 2, title: 'Higher' },
          { rank: 'aZ', number: 3, title: 'Bottom' },
          // In another column: its rank must not count for To Do.
          { rank: 'az', number: 4, title: 'Done card', status: Status.DONE },
        ].map((ticket) => ({
          ...ticket,
          projectId: matrix.project.id,
          reporterId: matrix.owner.id,
        })),
      });
      await testPrisma.project.update({
        where: { id: matrix.project.id },
        data: { ticketCounter: 4 },
      });

      const response = await createTicket('member', { title: 'New card' });

      expect(response.status).toBe(201);
      expect((response.body as Ticket).key).toBe('WEB-5');
      // The To Do column in the database's own order (the board query will use the same).
      const column = await testPrisma.ticket.findMany({
        where: { projectId: matrix.project.id, status: Status.TODO },
        orderBy: { rank: 'asc' },
        select: { title: true, rank: true },
      });
      expect(column.map(({ title }) => title)).toEqual(['Higher', 'Top', 'Bottom', 'New card']);
      // PostgreSQL sorts the ranks byte by byte, the same order as JavaScript.
      const ranks = column.map(({ rank }) => rank);
      expect([...ranks].sort(byteOrder)).toEqual(ranks);
    });
  });

  describe('concurrent creates', () => {
    it('TKT-1: 20 parallel creates get unique, contiguous keys 1..20', async () => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          createTicket(index % 2 === 0 ? 'owner' : 'member', { title: `Parallel ${index + 1}` }),
        ),
      );

      expect(responses.map(({ status }) => status)).toEqual(Array<number>(20).fill(201));
      const numbers = responses
        .map(({ body }) => (body as Ticket).number)
        .sort((first, second) => first - second);
      expect(numbers).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
      expect(new Set(responses.map(({ body }) => (body as Ticket).key)).size).toBe(20);
      expect(await ticketCount()).toBe(20);
      expect(await ticketCounter()).toBe(20);

      // Each create went below the one before it: ranks are unique and follow the numbers.
      const column = await testPrisma.ticket.findMany({
        where: { projectId: matrix.project.id, status: Status.TODO },
        orderBy: { rank: 'asc' },
        select: { number: true, rank: true },
      });
      expect(column.map(({ number }) => number)).toEqual(numbers);
      expect(new Set(column.map(({ rank }) => rank)).size).toBe(20);
    });
  });

  describe('access', () => {
    it.each([
      ['owner', 201],
      ['member', 201],
      ['outsider', 404],
      ['visitor', 401],
    ] as const)('TKT-1: %s gets %i', async (caller, status) => {
      const response = await createTicket(caller, { title: 'Access check' });

      expect(response.status).toBe(status);
      expect(await ticketCount()).toBe(status === 201 ? 1 : 0);
    });

    it('TKT-1: an outsider gets the same 404 as for a missing project, and no ticket is made', async () => {
      const outsider = await createTicket('outsider', { title: 'Sneaky' });
      const missing = await createTicket('outsider', { title: 'Sneaky' }, ticketsUrl('NOPE'));

      expect(outsider.body).toEqual({
        error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
      });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual(outsider.body);
      expect(await ticketCounter()).toBe(0);
    });

    it('TKT-1: an outsider gets 404 before the body is validated', async () => {
      const response = await createTicket('outsider', { status: 'DONE' });

      expect(response.status).toBe(404);
    });

    it('TKT-1: a visitor gets 401 UNAUTHENTICATED before the body is validated', async () => {
      const response = await createTicket('visitor', {});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
    });

    it('TKT-1: a cross-site request gets 403 and no ticket is made', async () => {
      const response = await requestAs(app, matrix, 'member', 'post', ticketsUrl())
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ title: 'Forged' });

      expect(response.status).toBe(403);
      expect(await ticketCount()).toBe(0);
    });
  });

  describe('validation', () => {
    it.each([
      ['a missing title', {}, 'title'],
      ['a blank title', { title: '   ' }, 'title'],
      ['a title over 120 characters', { title: 'a'.repeat(121) }, 'title'],
      ['an unknown type', { title: 'T', type: 'EPIC' }, 'type'],
      ['an unknown priority', { title: 'T', priority: 'URGENT' }, 'priority'],
      ['an impossible due date', { title: 'T', dueDate: '2026-02-30' }, 'dueDate'],
      ['a due date with a time', { title: 'T', dueDate: '2026-12-01T10:00:00Z' }, 'dueDate'],
      [
        'a description over 10,000 characters',
        { title: 'T', description: 'a'.repeat(10_001) },
        'description',
      ],
    ])('TKT-1: %s gets 400 and no number is used', async (_case, body, field) => {
      const response = await createTicket('member', body);

      expectValidationError(response, field);
      expect(await ticketCount()).toBe(0);
      expect(await ticketCounter()).toBe(0);
    });

    it.each(['status', 'number', 'assigneeId', 'rank', 'reporterId', 'estimateMinutes'])(
      'TKT-1: the field %s can not be set (400 Unknown field)',
      async (field) => {
        const response = await createTicket('member', { title: 'T', [field]: 'x' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Unknown field',
            details: [{ field, message: 'Unknown field' }],
          },
        });
        expect(await ticketCount()).toBe(0);
      },
    );

    it('TKT-1: a body that is not a JSON object gets 400', async () => {
      const response = await requestAs(app, matrix, 'member', 'post', ticketsUrl())
        .set('Content-Type', 'application/json')
        .send('["title"]');

      expect(response.status).toBe(400);
      expect((response.body as { error: { code: string } }).error.code).toBe(
        ErrorCode.VALIDATION_ERROR,
      );
    });
  });

  describe('service', () => {
    it('TKT-1: a project deleted after the access check gets 404 and no ticket', async () => {
      const service = createTicketsService(testPrisma);
      const deleted = { id: '6f1c1f0e-3c4b-4a8e-9d4c-2f1b5e7a9c10', key: 'GONE' };

      await expect(
        service.createTicket(deleted, matrix.owner.id, {
          title: 'Late',
          description: null,
          type: 'TASK',
          priority: 'MEDIUM',
          dueDate: null,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE });
      expect(await testPrisma.ticket.count()).toBe(0);
    });
  });
});
