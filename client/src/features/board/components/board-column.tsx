import type { BoardCard, BoardColumn as BoardColumnData } from '@mini-jira/shared';
import { Loader2Icon } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { TicketCard } from '@/features/board/components/ticket-card';
import { useMoreColumnCards } from '@/features/board/hooks/use-more-column-cards';
import { STATUS_LABELS } from '@/features/tickets/lib/ticket-labels';

interface BoardColumnProps {
  projectKey: string;
  column: BoardColumnData;
  /** Shown in place of the cards when the column has none (the empty board, wireframe 03 G). */
  emptyState?: ReactNode;
}

/**
 * The board's first 50 cards and the pages "Load more" added, as one list. A card moved between
 * two requests can come back twice; it is shown once.
 */
function uniqueCards(pages: readonly BoardCard[][]): BoardCard[] {
  const cardsById = new Map(pages.flat().map((card) => [card.id, card]));

  return [...cardsById.values()];
}

/**
 * One status column of the board (wireframe 03 A): the status name and the total number of
 * tickets in it, then its cards in rank order. The cards scroll on their own, so the header
 * stays visible in a long column. "Load more" adds the next 50 cards when there are more.
 */
export function BoardColumn({ projectKey, column, emptyState }: BoardColumnProps): ReactElement {
  const headingId = useId();
  const [isMoreRequested, setIsMoreRequested] = useState(false);
  // The first card that "Load more" adds gets focus, so focus isn't lost when the button goes.
  const [firstAddedIndex, setFirstAddedIndex] = useState<number | null>(null);
  const more = useMoreColumnCards({
    projectKey,
    status: column.status,
    firstCursor: column.nextCursor,
    enabled: isMoreRequested,
  });
  const extraPages = more.data?.pages ?? [];
  const cards = uniqueCards([column.items, ...extraPages.map((page) => page.items)]);
  const hasMore = more.data ? more.hasNextPage : column.nextCursor !== null;

  /** Focuses the first added card once it is on screen, then forgets it. */
  function focusFirstAddedCard(link: HTMLAnchorElement | null): void {
    if (link) {
      link.focus();
      setFirstAddedIndex(null);
    }
  }

  function handleLoadMore(): void {
    setFirstAddedIndex(cards.length);

    if (!isMoreRequested) {
      // Turning the query on loads the first extra page.
      setIsMoreRequested(true);
    } else if (more.data) {
      void more.fetchNextPage();
    } else {
      // The first extra page failed: ask for it again.
      void more.refetch();
    }
  }

  return (
    <section aria-labelledby={headingId} className={COLUMN_CLASSES}>
      <h2
        id={headingId}
        className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2 text-sm font-medium"
      >
        {/* The {' '} keep the words apart for screen readers ("To Do 12 tickets"). */}
        {STATUS_LABELS[column.status]}{' '}
        <span className="text-muted-foreground tabular-nums">
          {column.total}{' '}
          <span className="sr-only">{column.total === 1 ? 'ticket' : 'tickets'}</span>
        </span>
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pt-1 pb-3">
        {cards.length === 0 ? (
          emptyState
        ) : (
          <ul className="flex flex-col gap-2">
            {cards.map((card, index) => (
              <li key={card.id}>
                <TicketCard
                  projectKey={projectKey}
                  card={card}
                  ref={index === firstAddedIndex ? focusFirstAddedCard : undefined}
                />
              </li>
            ))}
          </ul>
        )}
        {more.isError && (
          <p role="alert" className="text-center text-sm">
            Couldn&apos;t load more tickets. Try again.
          </p>
        )}
        {hasMore && (
          <Button
            variant="outline"
            className="bg-background"
            disabled={more.isFetching}
            onClick={handleLoadMore}
          >
            {more.isFetching ? (
              <>
                <Loader2Icon aria-hidden="true" className="motion-safe:animate-spin" />
                Loading…
              </>
            ) : (
              <>
                {/* Four columns can each have the button: the name says which one. */}
                Load more <span className="sr-only">{STATUS_LABELS[column.status]} tickets</span>
              </>
            )}
          </Button>
        )}
      </div>
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
