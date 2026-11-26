import { BOARD_STATUSES, ErrorCode, Priority, Status, TicketType } from '@mini-jira/shared';
import type { Board, BoardCard, BoardColumn } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';

import { mockProject, TEST_PROJECT } from './project';
import { renderRoute } from './render-route';
import { server } from './server';
import { mockLoggedIn } from './session';

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

/**
 * Makes GET /api/projects/WEB/board/columns/:status answer with the page the test gives for each
 * cursor ("load more", BRD-1); an unknown cursor fails with a server error. Returns the cursors
 * it was asked for.
 */
export function mockColumnPages(
  status: Status,
  pagesByCursor: Record<string, BoardColumn>,
): string[] {
  const cursors: string[] = [];

  server.use(
    http.get(`${BOARD_URL}/columns/${status}`, ({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
      cursors.push(cursor);
      const page = pagesByCursor[cursor];

      return page
        ? HttpResponse.json(page)
        : HttpResponse.json(
            { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
            { status: 500 },
          );
    }),
  );

  return cursors;
}

/**
 * Opens the WEB board as a logged-in owner. The app retries a 5xx three times with growing
 * waits; the board's queries don't here, so the tests check the error states at once.
 */
export function renderBoard(): ReturnType<typeof renderRoute> {
  mockLoggedIn();
  mockProject();
  const queryClient = createQueryClient();
  queryClient.setQueryDefaults(PROJECTS_QUERY_KEY, { retry: false });

  return renderRoute(`/projects/${TEST_PROJECT.key}/board`, undefined, { queryClient });
}
