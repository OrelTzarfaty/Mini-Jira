import { ticketSchema } from '@mini-jira/shared';
import type { CreateTicketInput, Ticket } from '@mini-jira/shared';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';

/**
 * Creates a ticket in the project (TKT-1, any member). The server picks the key (WEB-13), puts
 * the ticket at the bottom of To Do, and makes the caller its reporter. Failures arrive as an
 * ApiError: 400 VALIDATION_ERROR with details per field, 404 for a non-member.
 */
export function useCreateTicketMutation(
  projectKey: string,
): UseMutationResult<Ticket, Error, CreateTicketInput> {
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
  });
}
