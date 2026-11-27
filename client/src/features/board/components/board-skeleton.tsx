import { BOARD_STATUSES } from '@mini-jira/shared';
import type { ReactElement } from 'react';

import { COLUMN_CLASSES } from '@/features/board/components/board-column';

// Wireframe 03 G: 2–3 grey placeholder cards per column; varied, so it reads as a board.
const PLACEHOLDER_CARDS_PER_COLUMN = [3, 2, 2, 3] as const;

/** The board while it loads (wireframe 03 G): four columns with grey placeholder cards. */
export function BoardSkeleton({ className }: { className: string }): ReactElement {
  return (
    <div role="status">
      <span className="sr-only">Loading the board</span>
      <div aria-hidden="true" className={`${className} motion-safe:animate-pulse`}>
        {BOARD_STATUSES.map((status, columnIndex) => (
          <div key={status} className={`${COLUMN_CLASSES} gap-2 p-3`}>
            <div className="mb-2 h-5 w-24 rounded-sm bg-background" />
            {Array.from({ length: PLACEHOLDER_CARDS_PER_COLUMN[columnIndex] ?? 2 }, (_, index) => (
              <div key={index} className="h-28 shrink-0 rounded-lg bg-background" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
