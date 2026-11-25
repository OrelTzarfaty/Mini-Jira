import { ticketSchema } from '@mini-jira/shared';
import type { CreateTicketInput, Ticket } from '@mini-jira/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';

/**
 * Creates a ticket in the project (TKT-1, any member). The server picks the key (WEB-13), puts
 * the ticket at the bottom of To Do, and makes the caller its reporter. Failures arrive as an
 * ApiError: 400 VALIDATION_ERROR with details per field, 404 for a non-member.
 */
export function useCreateTicketMutation(
  projectKey: string,
): UseMutationResult<Ticket, Error, CreateTicketInput> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // alert instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: (input: CreateTicketInput) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}/tickets`, {
        method: 'POST',
        body: input,
        schema: ticketSchema,
      }),
    onSuccess: () => {
      // Everything about projects is under PROJECTS_QUERY_KEY: My Projects' open-ticket counts
      // (PRJ-2) and, once they exist, the project's board, list, and ticket queries (BRD-1,
      // LST-1, TKT-2), which go under projectQueryKey(projectKey). Reloaded rather than added to
      // the cache by hand: the server decides the key, the order, and the counts.
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
