import { ticketSchema } from '@mini-jira/shared';
import type { Ticket, UpdateTicketInput } from '@mini-jira/shared';
import { hashKey, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY, ticketQueryKey } from '@/api/query-keys';

/**
 * Saves an edit of a ticket (TKT-3, any member). The body carries the `updatedAt` the client
 * loaded, so the server can refuse a save over someone else's newer change (409 EDIT_CONFLICT,
 * CON-1). Failures arrive as an ApiError: 400 VALIDATION_ERROR with details per field, 404 when
 * the ticket is gone, 409 EDIT_CONFLICT.
 *
 * Not optimistic: the edit form stays open until the server answers, so the user never sees a
 * change that may still be refused (a conflict must keep their input, not roll it back).
 */
export function useUpdateTicketMutation(
  projectKey: string,
  ticketKey: string,
): UseMutationResult<Ticket, Error, UpdateTicketInput> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // alert instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: (changes: UpdateTicketInput) =>
      apiRequest(
        `/projects/${encodeURIComponent(projectKey)}/tickets/${encodeURIComponent(ticketKey)}`,
        { method: 'PATCH', body: changes, schema: ticketSchema },
      ),
    // In the hook, not in mutate(), so the cache is right even if the page closed meanwhile.
    onSuccess: (ticket) => {
      const queryKey = ticketQueryKey(projectKey, ticketKey);
      // The answer is the saved ticket with its new updatedAt, so the page shows it at once
      // and the next edit sends the right version.
      queryClient.setQueryData(queryKey, ticket);
      // The board, the list, and My Projects' open-ticket counts (a new status may close the
      // ticket) all live under PROJECTS_QUERY_KEY. The ticket itself is fresh already.
      const ticketHash = hashKey(queryKey);
      void queryClient.invalidateQueries({
        queryKey: PROJECTS_QUERY_KEY,
        predicate: (query) => query.queryHash !== ticketHash,
      });
    },
  });
}
