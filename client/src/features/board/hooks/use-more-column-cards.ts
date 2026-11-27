import { boardColumnSchema } from '@mini-jira/shared';
import type { BoardColumn, Status } from '@mini-jira/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { boardQueryKey } from '@/api/query-keys';

interface MoreColumnCardsOptions {
  projectKey: string;
  status: Status;
  /** The column's `nextCursor` from the board: where the extra cards start (null: no more). */
  firstCursor: string | null;
  /** False until the user asks for more, so a board never loads cards nobody asked for. */
  enabled: boolean;
}

/**
 * The cards of one column after the board's first 50 (BRD-1 "load more"), 50 per page. Each page
 * continues from the previous one's `nextCursor`. The key sits under the board's key, so when
 * the board is refreshed (a new ticket, TKT-1), the loaded pages are refreshed with it, and it
 * holds the first cursor, so a board whose first 50 changed starts over.
 */
export function useMoreColumnCards({
  projectKey,
  status,
  firstCursor,
  enabled,
}: MoreColumnCardsOptions): UseInfiniteQueryResult<InfiniteData<BoardColumn>> {
  return useInfiniteQuery({
    queryKey: [...boardQueryKey(projectKey), 'column', status, firstCursor],
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        `/projects/${encodeURIComponent(projectKey)}/board/columns/${status}?cursor=${encodeURIComponent(pageParam)}`,
        { schema: boardColumnSchema, signal },
      ),
    initialPageParam: firstCursor ?? '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && firstCursor !== null,
    // As useBoard: an error with a way to try again rather than a button that never ends.
    networkMode: 'always',
  });
}
