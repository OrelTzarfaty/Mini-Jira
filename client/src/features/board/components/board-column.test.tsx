import { Status } from '@mini-jira/shared';
import type { BoardCard } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  BOARD_URL,
  buildBoard,
  buildBoardCard,
  buildBoardColumn,
  mockBoard,
  mockColumnPages,
  renderBoard,
} from '@/test/board';
import { server } from '@/test/server';

/** Cards WEB-<from> to WEB-<to>, in To Do. */
function buildCards(from: number, to: number): BoardCard[] {
  return Array.from({ length: to - from + 1 }, (_, index) => buildBoardCard(from + index));
}

/** A To Do column showing WEB-1..3 of 7 tickets, with more behind cursor "c1". */
function mockLongToDoColumn(): void {
  mockBoard(
    buildBoard({
      [Status.TODO]: buildBoardColumn(Status.TODO, buildCards(1, 3), {
        total: 7,
        nextCursor: 'c1',
      }),
    }),
  );
}

async function findToDoColumn(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: /^To Do/ });
}

function cardKeys(column: HTMLElement): string[] {
  return within(column)
    .getAllByRole('link')
    .map((link) => /WEB-\d+/.exec(link.textContent)?.[0] ?? '');
}

describe('BoardColumn', () => {
  it('BRD-1: "Load more" adds the next cards page by page, then goes away', async () => {
    mockLongToDoColumn();
    const cursors = mockColumnPages(Status.TODO, {
      c1: buildBoardColumn(Status.TODO, buildCards(4, 5), { total: 7, nextCursor: 'c2' }),
      c2: buildBoardColumn(Status.TODO, buildCards(6, 7), { total: 7 }),
    });
    renderBoard();
    const column = await findToDoColumn();

    await userEvent.click(within(column).getByRole('button', { name: 'Load more To Do tickets' }));
    await waitFor(() => {
      expect(cardKeys(column)).toHaveLength(5);
    });
    await userEvent.click(within(column).getByRole('button', { name: 'Load more To Do tickets' }));

    await waitFor(() => {
      expect(cardKeys(column)).toEqual([
        'WEB-1',
        'WEB-2',
        'WEB-3',
        'WEB-4',
        'WEB-5',
        'WEB-6',
        'WEB-7',
      ]);
    });
    expect(cursors).toEqual(['c1', 'c2']);
    expect(within(column).queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument();
    // Focus moves to the first added card, so it isn't lost when the button goes.
    expect(within(column).getByRole('link', { name: /WEB-6/ })).toHaveFocus();
  });

  it('BRD-1: a column without more cards has no "Load more"', async () => {
    mockBoard(buildBoard({ [Status.TODO]: buildBoardColumn(Status.TODO, buildCards(1, 2)) }));
    renderBoard();
    const column = await findToDoColumn();

    expect(cardKeys(column)).toEqual(['WEB-1', 'WEB-2']);
    expect(within(column).queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument();
  });

  it('BRD-1: "Load more" is disabled and says so while the next cards load', async () => {
    mockLongToDoColumn();
    server.use(
      http.get(`${BOARD_URL}/columns/${Status.TODO}`, async () => {
        await delay('infinite');

        return HttpResponse.json({});
      }),
    );
    renderBoard();
    const column = await findToDoColumn();

    await userEvent.click(within(column).getByRole('button', { name: 'Load more To Do tickets' }));

    expect(await within(column).findByRole('button', { name: 'Loading…' })).toBeDisabled();
  });

  it('BRD-1: a failed "Load more" keeps the loaded cards, says so, and can try again', async () => {
    mockLongToDoColumn();
    // No page for "c1" at first: the API fails.
    mockColumnPages(Status.TODO, {});
    renderBoard();
    const column = await findToDoColumn();

    await userEvent.click(within(column).getByRole('button', { name: 'Load more To Do tickets' }));

    expect(await within(column).findByRole('alert')).toHaveTextContent(
      "Couldn't load more tickets. Try again.",
    );
    expect(cardKeys(column)).toEqual(['WEB-1', 'WEB-2', 'WEB-3']);

    mockColumnPages(Status.TODO, {
      c1: buildBoardColumn(Status.TODO, buildCards(4, 7), { total: 7 }),
    });
    await userEvent.click(within(column).getByRole('button', { name: 'Load more To Do tickets' }));

    await waitFor(() => {
      expect(cardKeys(column)).toHaveLength(7);
    });
    expect(within(column).queryByRole('alert')).not.toBeInTheDocument();
  });
});
