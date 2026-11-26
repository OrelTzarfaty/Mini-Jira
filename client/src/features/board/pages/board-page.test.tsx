import { Status } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildBoard, buildBoardCard, buildBoardColumn, mockBoard, renderBoard } from '@/test/board';

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
});
