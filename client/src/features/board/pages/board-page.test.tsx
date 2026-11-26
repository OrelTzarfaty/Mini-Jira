import { Status } from '@mini-jira/shared';
import type { BoardCard } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  BOARD_URL,
  buildBoard,
  buildBoardCard,
  buildBoardColumn,
  mockBoard,
  mockBoardError,
  renderBoard,
} from '@/test/board';
import { TEST_PROJECT } from '@/test/project';
import { server } from '@/test/server';
import { TEST_USER } from '@/test/session';

async function findColumn(name: RegExp): Promise<HTMLElement> {
  return screen.findByRole('region', { name });
}

describe('BoardPage', () => {
  it('BRD-1: shows the four status columns in workflow order with their totals', async () => {
    mockBoard(
      buildBoard({
        [Status.TODO]: buildBoardColumn(Status.TODO, [buildBoardCard(1)], { total: 12 }),
        [Status.DONE]: buildBoardColumn(Status.DONE, [buildBoardCard(2, { status: Status.DONE })]),
      }),
    );
    renderBoard();

    await findColumn(/^To Do/);
    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(headings.map((heading) => heading.textContent)).toEqual([
      'To Do 12 tickets',
      'In Progress 0 tickets',
      'In Review 0 tickets',
      'Done 1 ticket',
    ]);
  });

  it('BRD-1: the board sits under the project header and names itself in the tab title', async () => {
    renderBoard();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'WEB Website Redesign' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('WEB board · Mini-Jira');
  });

  it("BRD-1: each column lists its cards in the API's rank order", async () => {
    mockBoard(
      buildBoard({
        [Status.TODO]: buildBoardColumn(Status.TODO, [buildBoardCard(7), buildBoardCard(3)]),
      }),
    );
    renderBoard();

    const cards = within(await findColumn(/^To Do/)).getAllByRole('link');

    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining('WEB-7'),
      expect.stringContaining('WEB-3'),
    ]);
  });

  it('BRD-1: shows four columns of placeholder cards while the board loads', async () => {
    server.use(
      http.get(BOARD_URL, async () => {
        await delay('infinite');

        return HttpResponse.json({});
      }),
    );
    renderBoard();

    // The project loads first (PRJ-6), with its own status, so the board's is found by its words.
    expect(
      (await screen.findByText('Loading the board')).closest('[role="status"]'),
    ).not.toBeNull();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('BRD-1: a failed load says so, and "Try again" loads the board', async () => {
    mockBoardError();
    renderBoard();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the board.");

    mockBoard(buildBoard({ [Status.TODO]: buildBoardColumn(Status.TODO, [buildBoardCard(1)]) }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await findColumn(/^To Do/)).toHaveTextContent('WEB-1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('BRD-1: an empty board says so in To Do, and its button creates the first ticket, which then shows', async () => {
    // The API's tickets: none until the form sends one.
    const tickets: BoardCard[] = [];
    server.use(
      http.get(BOARD_URL, () =>
        HttpResponse.json(buildBoard({ [Status.TODO]: buildBoardColumn(Status.TODO, tickets) })),
      ),
      http.post(`/api/projects/${TEST_PROJECT.key}/tickets`, () => {
        const card = buildBoardCard(1, { title: 'Set up repo' });
        tickets.push(card);

        return HttpResponse.json(
          {
            ...card,
            description: null,
            reporter: { id: TEST_USER.id, name: TEST_USER.name },
            createdAt: card.updatedAt,
          },
          { status: 201 },
        );
      }),
    );
    renderBoard();
    const toDo = await findColumn(/^To Do/);

    expect(within(toDo).getByText('No tickets yet.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /^Done/ })).queryByText('No tickets yet.'),
    ).not.toBeInTheDocument();

    await userEvent.click(within(toDo).getByRole('button', { name: 'Create the first ticket' }));
    const popup = await screen.findByRole('dialog', { name: 'Create ticket in WEB' });
    await userEvent.type(within(popup).getByLabelText('Title'), 'Set up repo');
    await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));

    expect(
      await within(toDo).findByRole('link', { name: /WEB-1 Set up repo/ }),
    ).toBeInTheDocument();
    expect(within(toDo).queryByText('No tickets yet.')).not.toBeInTheDocument();
  });
});
