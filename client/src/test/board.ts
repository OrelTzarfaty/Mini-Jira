import { BOARD_STATUSES, ErrorCode, Priority, Status, TicketType } from '@mini-jira/shared';
import type { Board, BoardCard, BoardColumn } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { TEST_PROJECT } from './project';
import { server } from './server';

export const BOARD_URL = `/api/projects/${TEST_PROJECT.key}/board`;

/** A card as the board shows it (BRD-1): WEB-<number>, a To Do task by default. */
export function buildBoardCard(number: number, overrides: Partial<BoardCard> = {}): BoardCard {
  return {
    id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    key: `${TEST_PROJECT.key}-${String(number)}`,
    number,
    title: `Ticket ${String(number)}`,
    type: TicketType.TASK,
    priority: Priority.MEDIUM,
    status: Status.TODO,
    dueDate: null,
    assignee: null,
    updatedAt: '2026-11-25T10:00:00.000Z',
    ...overrides,
  };
}

/** One column: its total is the number of cards unless the test says otherwise. */
export function buildBoardColumn(
  status: Status,
  items: BoardCard[] = [],
  overrides: Partial<BoardColumn> = {},
): BoardColumn {
  return { status, total: items.length, items, nextCursor: null, ...overrides };
}

/** The four columns in workflow order, empty unless the test gives one its own. */
export function buildBoard(columns: Partial<Record<Status, BoardColumn>> = {}): Board {
  return {
    columns: BOARD_STATUSES.map((status) => columns[status] ?? buildBoardColumn(status)),
  };
}

/** Makes GET /api/projects/WEB/board answer with the board. */
export function mockBoard(board: Board): void {
  server.use(http.get(BOARD_URL, () => HttpResponse.json(board)));
}

/** Makes GET /api/projects/WEB/board fail with a server error (BRD-1 error state). */
export function mockBoardError(): void {
  server.use(
    http.get(BOARD_URL, () =>
      HttpResponse.json(
        { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
        { status: 500 },
      ),
    ),
  );
}
