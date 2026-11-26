import {
  BOARD_COLUMN_LIMIT,
  BOARD_STATUSES,
  boardColumnSchema,
  boardSchema,
  ErrorCode,
  INVALID_BOARD_CURSOR_MESSAGE,
  INVALID_BOARD_STATUS_MESSAGE,
  PROJECT_NOT_FOUND_MESSAGE,
  Status,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { Board, BoardColumn } from '@mini-jira/shared';
import type { Express } from 'express';
import { generateNKeysBetween } from 'fractional-indexing';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { encodeBoardCursor } from '../../src/lib/board-cursor.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';
import { createTestTickets } from '../helpers/tickets.js';

interface SeedTicket {
  status: Status;
  rank: string;
  title?: string;
}

/**
 * Inserts tickets directly with the given status and rank (one insert, fast even for 100+),
 * numbered after the project's existing tickets. Returns their ids in the order given.
 */
async function insertTickets(
  matrix: ProjectAccessMatrix,
  tickets: readonly SeedTicket[],
): Promise<string[]> {
  const { ticketCounter } = await testPrisma.project.update({
    where: { id: matrix.project.id },
    data: { ticketCounter: { increment: tickets.length } },
    select: { ticketCounter: true },
  });
  const first = ticketCounter - tickets.length + 1;

  const rows = await testPrisma.ticket.createManyAndReturn({
    data: tickets.map(({ status, rank, title }, index) => ({
      projectId: matrix.project.id,
      number: first + index,
      title: title ?? `Ticket ${first + index}`,
      status,
      rank,
      reporterId: matrix.owner.id,
    })),
    select: { id: true, number: true },
  });

  return [...rows].sort((a, b) => a.number - b.number).map(({ id }) => id);
}

const keysOf = (column: BoardColumn | undefined): string[] =>
  (column?.items ?? []).map(({ key }) => key);

describe('GET /api/projects/:projectKey/board (BRD-1)', () => {
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

  const boardUrl = (query = ''): string => `/api/projects/${matrix.project.key}/board${query}`;
  const columnUrl = (status: string, query = ''): string =>
    `/api/projects/${matrix.project.key}/board/columns/${status}${query}`;
  const getBoard = (caller: Caller = 'member', query = ''): request.Test =>
    requestAs(app, matrix, caller, 'get', boardUrl(query));
  const getColumn = (status: string, query = '', caller: Caller = 'member'): request.Test =>
    requestAs(app, matrix, caller, 'get', columnUrl(status, query));

  describe('the board', () => {
    it.each(['owner', 'member'] as const)(
      'BRD-1: the %s gets all four columns in workflow order, also when empty',
      async (caller) => {
        const response = await getBoard(caller);

        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBe('no-store');
        expect(boardSchema.strict().safeParse(response.body).success).toBe(true);
        expect(response.body).toEqual({
          columns: BOARD_STATUSES.map((status) => ({
            status,
            total: 0,
            items: [],
            nextCursor: null,
          })),
        });
      },
    );

    it('BRD-1: each column has its total and its cards in rank order; cards show only card fields', async () => {
      // Created in this order, but ranked in another order within each column.
      await insertTickets(matrix, [
        { status: Status.IN_PROGRESS, rank: 'a2', title: 'Third' },
        { status: Status.IN_PROGRESS, rank: 'a0', title: 'First' },
        { status: Status.DONE, rank: 'a0' },
        { status: Status.IN_PROGRESS, rank: 'a1', title: 'Second' },
      ]);
      // Two To Do tickets through the real service: at the bottom of the column, in order.
      await createTestTickets(matrix.project, matrix.owner.id, ['Todo A', 'Todo B']);
      // An assignee and a due date, to check how a card shows them.
      await testPrisma.ticket.update({
        where: { projectId_number: { projectId: matrix.project.id, number: 2 } },
        data: { assigneeId: matrix.member.id, dueDate: new Date('2026-12-01') },
      });

      const response = await getBoard();

      expect(response.status).toBe(200);
      const board = response.body as Board;
      expect(board.columns.map(({ status, total }) => ({ status, total }))).toEqual([
        { status: Status.TODO, total: 2 },
        { status: Status.IN_PROGRESS, total: 3 },
        { status: Status.IN_REVIEW, total: 0 },
        { status: Status.DONE, total: 1 },
      ]);
      expect(keysOf(board.columns[0])).toEqual(['WEB-5', 'WEB-6']);
      expect(keysOf(board.columns[1])).toEqual(['WEB-2', 'WEB-4', 'WEB-1']);
      expect(keysOf(board.columns[3])).toEqual(['WEB-3']);
      expect(board.columns.every(({ nextCursor }) => nextCursor === null)).toBe(true);

      const card = board.columns[1]?.items[0];
      expect(card).toMatchObject({
        key: 'WEB-2',
        number: 2,
        title: 'First',
        type: 'TASK',
        priority: 'MEDIUM',
        status: Status.IN_PROGRESS,
        dueDate: '2026-12-01',
        assignee: { id: matrix.member.id, name: 'Member' },
      });
      // Only the card fields: no description, and never the internal rank.
      expect(Object.keys(card ?? {}).sort()).toEqual(
        [
          'assignee',
          'dueDate',
          'id',
          'key',
          'number',
          'priority',
          'status',
          'title',
          'type',
          'updatedAt',
        ].sort(),
      );
      expect(board.columns[1]?.items[1]?.assignee).toBeNull();
    });

    it("BRD-1: shows only this project's tickets", async () => {
      const other = await testPrisma.project.create({
        data: { key: 'OPS', name: 'Operations', ticketCounter: 1 },
      });
      await testPrisma.ticket.create({
        data: {
          projectId: other.id,
          number: 1,
          title: 'Other project',
          rank: 'a0',
          reporterId: matrix.owner.id,
        },
      });

      const board = (await getBoard()).body as Board;
      const column = (await getColumn(Status.TODO)).body as BoardColumn;

      // The totals and the cards come from different queries: both must be scoped.
      expect(board.columns.map(({ total }) => total)).toEqual([0, 0, 0, 0]);
      expect(board.columns.flatMap(({ items }) => items)).toEqual([]);
      expect(column).toEqual({ status: Status.TODO, total: 0, items: [], nextCursor: null });
    });

    it(`BRD-1: a column with more than ${BOARD_COLUMN_LIMIT} tickets returns the first ${BOARD_COLUMN_LIMIT} and a cursor`, async () => {
      const ids = await insertTickets(
        matrix,
        generateNKeysBetween(null, null, BOARD_COLUMN_LIMIT + 1).map((rank) => ({
          status: Status.TODO,
          rank,
        })),
      );

      const board = (await getBoard()).body as Board;
      const todo = board.columns[0];

      expect(todo?.total).toBe(BOARD_COLUMN_LIMIT + 1);
      expect(todo?.items.map(({ id }) => id)).toEqual(ids.slice(0, BOARD_COLUMN_LIMIT));
      expect(todo?.nextCursor).toEqual(expect.any(String));
    });

    it('BRD-1: a visitor without a session gets 401', async () => {
      const response = await getBoard('visitor');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
    });

    it('BRD-1: an outsider gets 404 and no board data, even with a bad query', async () => {
      await insertTickets(matrix, [{ status: Status.TODO, rank: 'a0' }]);

      for (const query of ['', '?assignee=me']) {
        const response = await getBoard('outsider', query);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
        });
      }
    });

    it('BRD-1: a project that does not exist gets the same 404', async () => {
      const response = await requestAs(app, matrix, 'member', 'get', '/api/projects/NOPE/board');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
      });
    });

    it('BRD-1: unknown query parameters get 400 (the filters come with BRD-4)', async () => {
      const response = await getBoard('member', '?assignee=me');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          details: [{ field: 'assignee', message: 'Unknown field' }],
        },
      });
    });
  });

  describe('load more for one column', () => {
    it(`BRD-1: pages through a long column ${BOARD_COLUMN_LIMIT} cards at a time, without gaps or repeats`, async () => {
      const count = BOARD_COLUMN_LIMIT * 2 + 20;
      const ids = await insertTickets(
        matrix,
        generateNKeysBetween(null, null, count).map((rank) => ({ status: Status.IN_REVIEW, rank })),
      );

      const first = (await getBoard()).body as Board;
      const review = first.columns[2];
      const seen = (review?.items ?? []).map(({ id }) => id);
      let cursor = review?.nextCursor ?? null;
      const pageSizes = [review?.items.length];

      while (cursor !== null) {
        const response = await getColumn(Status.IN_REVIEW, `?cursor=${cursor}`);

        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBe('no-store');
        expect(boardColumnSchema.strict().safeParse(response.body).success).toBe(true);
        const column = response.body as BoardColumn;
        expect(column).toMatchObject({ status: Status.IN_REVIEW, total: count });
        seen.push(...column.items.map(({ id }) => id));
        pageSizes.push(column.items.length);
        cursor = column.nextCursor;
      }

      expect(pageSizes).toEqual([BOARD_COLUMN_LIMIT, BOARD_COLUMN_LIMIT, 20]);
      expect(seen).toEqual(ids);
    });

    it('BRD-1: cards with the same rank are ordered by id, and the cursor pages through them', async () => {
      // Two concurrent moves into the same gap (BRD-2) can give cards the same rank.
      const ids = await insertTickets(
        matrix,
        Array.from({ length: BOARD_COLUMN_LIMIT + 5 }, () => ({ status: Status.DONE, rank: 'a0' })),
      );
      const byId = [...ids].sort();

      const board = (await getBoard()).body as Board;
      const done = board.columns[3];
      const next = (await getColumn(Status.DONE, `?cursor=${done?.nextCursor ?? ''}`))
        .body as BoardColumn;

      expect(done?.items.map(({ id }) => id)).toEqual(byId.slice(0, BOARD_COLUMN_LIMIT));
      expect(next.items.map(({ id }) => id)).toEqual(byId.slice(BOARD_COLUMN_LIMIT));
      expect(next.nextCursor).toBeNull();
    });

    it('BRD-1: without a cursor it returns the column from the top', async () => {
      await insertTickets(matrix, [
        { status: Status.TODO, rank: 'a1' },
        { status: Status.TODO, rank: 'a0' },
        { status: Status.DONE, rank: 'a0' },
      ]);

      const response = await getColumn(Status.TODO);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: Status.TODO, total: 2, nextCursor: null });
      expect(keysOf(response.body as BoardColumn)).toEqual(['WEB-2', 'WEB-1']);
    });

    it('BRD-1: a cursor after the last card returns no cards', async () => {
      const [id] = await insertTickets(matrix, [{ status: Status.TODO, rank: 'a0' }]);
      const cursor = encodeBoardCursor({ rank: 'a0', id: id ?? '' });

      const response = await getColumn(Status.TODO, `?cursor=${cursor}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: Status.TODO, total: 1, items: [], nextCursor: null });
    });

    it.each(['todo', 'BLOCKED', 'In_Progress'])('BRD-1: the status %s gets 400', async (status) => {
      const response = await getColumn(status);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: INVALID_BOARD_STATUS_MESSAGE,
          details: [{ field: 'status', message: INVALID_BOARD_STATUS_MESSAGE }],
        },
      });
    });

    it.each([
      ['not a cursor', '?cursor=abc'],
      ['empty', '?cursor='],
      ['too long', `?cursor=${'a'.repeat(600)}`],
      ['sent twice', '?cursor=abc&cursor=def'],
      [
        'with an id that is not a UUID',
        `?cursor=${Buffer.from(JSON.stringify(['a0', '1'])).toString('base64url')}`,
      ],
    ])('BRD-1: a cursor that is %s gets 400', async (_label, query) => {
      const response = await getColumn(Status.TODO, query);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: INVALID_BOARD_CURSOR_MESSAGE,
          details: [{ field: 'cursor', message: INVALID_BOARD_CURSOR_MESSAGE }],
        },
      });
    });

    it('BRD-1: unknown query parameters get 400', async () => {
      const response = await getColumn(Status.TODO, '?page=2');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          details: [{ field: 'page', message: 'Unknown field' }],
        },
      });
    });

    it('BRD-1: a visitor without a session gets 401', async () => {
      const response = await getColumn(Status.TODO, '', 'visitor');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
    });

    it('BRD-1: an outsider gets 404 and no cards, even with a bad status', async () => {
      await insertTickets(matrix, [{ status: Status.TODO, rank: 'a0' }]);

      for (const status of [Status.TODO, 'BLOCKED']) {
        const response = await getColumn(status, '', 'outsider');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
        });
      }
    });
  });
});
