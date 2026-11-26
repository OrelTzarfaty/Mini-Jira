import { Status } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import { buildBoard, buildBoardCard, buildBoardColumn, mockBoard } from '@/test/board';
import { mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { mockLoggedIn } from '@/test/session';

function openBoard(): ReturnType<typeof renderRoute> {
  mockLoggedIn();
  mockProject();
  // The app retries a 5xx three times with growing waits; the tests check the error state now.
  const queryClient = createQueryClient();
  queryClient.setQueryDefaults(PROJECTS_QUERY_KEY, { retry: false });

  return renderRoute(`/projects/${TEST_PROJECT.key}/board`, undefined, { queryClient });
}

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
    openBoard();

    await findColumn(/^To Do/);
    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(headings.map((heading) => heading.textContent)).toEqual([
      'To Do12 tickets',
      'In Progress0 tickets',
      'In Review0 tickets',
      'Done1 ticket',
    ]);
  });

  it('BRD-1: the board sits under the project header and names itself in the tab title', async () => {
    openBoard();

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
    openBoard();

    const cards = within(await findColumn(/^To Do/)).getAllByRole('link');

    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining('WEB-7'),
      expect.stringContaining('WEB-3'),
    ]);
  });
});
