import type { BoardColumn as BoardColumnData } from '@mini-jira/shared';
import { useId } from 'react';
import type { ReactElement } from 'react';

import { TicketCard } from '@/features/board/components/ticket-card';
import { STATUS_LABELS } from '@/features/tickets/lib/ticket-labels';

interface BoardColumnProps {
  projectKey: string;
  column: BoardColumnData;
}

/**
 * One status column of the board (wireframe 03 A): the status name and the total number of
 * tickets in it, then its cards in rank order. The cards scroll on their own, so the header
 * stays visible in a long column.
 */
export function BoardColumn({ projectKey, column }: BoardColumnProps): ReactElement {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={COLUMN_CLASSES}>
      <h2
        id={headingId}
        className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2 text-sm font-medium"
      >
        {STATUS_LABELS[column.status]}
        <span className="text-muted-foreground tabular-nums">
          {column.total}
          <span className="sr-only"> {column.total === 1 ? 'ticket' : 'tickets'}</span>
        </span>
      </h2>
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pt-1 pb-3">
        {column.items.map((card) => (
          <li key={card.id}>
            <TicketCard projectKey={projectKey} card={card} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The column's frame, shared with the loading placeholder so both line up. The height fills
 * the screen below the project header (12.5rem: top bar, page padding, and header), with a floor
 * so a short window still shows a few cards.
 */
export const COLUMN_CLASSES =
  'flex h-[max(20rem,calc(100dvh-12.5rem))] min-w-0 flex-col rounded-lg bg-muted';
