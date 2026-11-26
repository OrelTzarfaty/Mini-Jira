import { ticketSchema } from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { ticketQueryKey } from '@/api/query-keys';

/**
 * One ticket of the project by its key, such as WEB-12 (TKT-2). An unknown number, a malformed
 * key, and another project's key (WEB-3 under /projects/APP) all fail with 404 NOT_FOUND; the
 * query client never retries a 4xx.
 */
export function useTicket(projectKey: string, ticketKey: string): UseQueryResult<Ticket> {
  return useQuery({
    queryKey: ticketQueryKey(projectKey, ticketKey),
    queryFn: ({ signal }) =>
      apiRequest(
        `/projects/${encodeURIComponent(projectKey)}/tickets/${encodeURIComponent(ticketKey)}`,
        { schema: ticketSchema, signal },
      ),
    // Asks even when the browser thinks it is offline, so the user gets an error with
    // "Try again" instead of a loading state that never ends (as in useProject).
    networkMode: 'always',
  });
}
