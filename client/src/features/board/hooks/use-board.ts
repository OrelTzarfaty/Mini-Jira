import { boardSchema } from '@mini-jira/shared';
import type { Board } from '@mini-jira/shared';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { boardQueryKey } from '@/api/query-keys';

/**
 * The project's board (BRD-1): the four status columns in workflow order, each with its total
 * and its first 50 cards by rank. One request for the whole board, so the counts and the cards
 * always come from the same moment.
 */
export function useBoard(projectKey: string): UseQueryResult<Board> {
  return useQuery({
    queryKey: boardQueryKey(projectKey),
    queryFn: ({ signal }) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}/board`, {
        schema: boardSchema,
        signal,
      }),
    // Asks even when the browser thinks it is offline, so the user gets the error state with
    // "Try again" instead of a loading state that never ends (as in useProject).
    networkMode: 'always',
  });
}
