import { Priority, Status, TicketType } from '@mini-jira/shared';
import type { BoardCard } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildBoard, buildBoardCard, buildBoardColumn, mockBoard, renderBoard } from '@/test/board';

// Noon local time, so "today" is the same day in every time zone.
const TODAY = new Date(2026, 10, 26, 12);

/** Opens the board with the one card in its column and returns the card's link. */
async function renderCard(card: BoardCard): Promise<HTMLElement> {
  mockBoard(buildBoard({ [card.status]: buildBoardColumn(card.status, [card]) }));
  renderBoard();

  return screen.findByRole('link', { name: new RegExp(card.key) });
}

describe('TicketCard', () => {
  beforeEach(() => {
    // Only the clock: the mocked API and React still use real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('BRD-1: shows type, key, title, priority, due date, and assignee, and opens the ticket', async () => {
    const card = await renderCard(
      buildBoardCard(12, {
        type: TicketType.BUG,
        title: 'Fix login redirect',
        priority: Priority.HIGH,
        dueDate: '2026-11-30',
        assignee: { id: '6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b', name: 'Dana Levi' },
      }),
    );

    expect(card).toHaveAccessibleName('Bug WEB-12 Fix login redirect High Due Nov 30 Dana Levi');
    expect(card).toHaveAttribute('href', '/projects/WEB/tickets/WEB-12');
    expect(within(card).getByRole('img', { name: 'Dana Levi' })).toHaveTextContent('DL');
  });

  it('BRD-1: an unassigned ticket shows an empty circle and no due date when it has none', async () => {
    const card = await renderCard(buildBoardCard(14, { priority: Priority.CRITICAL }));

    expect(card).toHaveAccessibleName('Task WEB-14 Ticket 14 Critical Unassigned');
    expect(within(card).getByRole('img', { name: 'Unassigned' })).toHaveClass('border-dashed');
  });

  it('BRD-1: a past due date on an open ticket is red and says "Overdue"', async () => {
    const card = await renderCard(buildBoardCard(9, { dueDate: '2026-11-20' }));

    expect(card).toHaveAccessibleName(/Overdue, due Nov 20/);
    expect(within(card).getByText('Nov 20', { exact: false })).toHaveClass('text-destructive');
  });

  it('BRD-1: a Done ticket with a past due date is not overdue', async () => {
    const card = await renderCard(
      buildBoardCard(2, { status: Status.DONE, dueDate: '2026-11-20' }),
    );

    expect(card).toHaveAccessibleName(/ Due Nov 20/);
    expect(within(card).getByText('Nov 20', { exact: false })).not.toHaveClass('text-destructive');
  });
});
