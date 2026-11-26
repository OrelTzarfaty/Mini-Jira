import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { z } from 'zod';

import { isNotFoundError } from '@/api/api-error';
import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY, ticketQueryKey } from '@/api/query-keys';

interface DeleteTicketOptions {
  /**
   * Leaves the ticket page. Called before the cache is cleaned up, so the page of the deleted
   * ticket is no longer on screen to ask for it again (which would be a 404).
   */
  onDeleted: () => void;
}

async function deleteTicket(projectKey: string, ticketKey: string): Promise<undefined> {
  try {
    return await apiRequest(
      `/projects/${encodeURIComponent(projectKey)}/tickets/${encodeURIComponent(ticketKey)}`,
      { method: 'DELETE', schema: z.undefined() },
    );
  } catch (error) {
    // 404: someone else deleted it first. The user wanted it gone and it is, so this counts as
    // done rather than an error they can do nothing about.
    if (isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

/**
 * Deletes a ticket with its comments and history (TKT-4, the reporter or the project owner).
 * Failures arrive as an ApiError: 403 FORBIDDEN for anyone else, or a network error.
 */
export function useDeleteTicketMutation(
  projectKey: string,
  ticketKey: string,
  { onDeleted }: DeleteTicketOptions,
): UseMutationResult<undefined, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // message instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: () => deleteTicket(projectKey, ticketKey),
    onSuccess: () => {
      onDeleted();
      // The ticket is gone: removed from the cache, not refreshed, since that could only be a 404.
      queryClient.removeQueries({ queryKey: ticketQueryKey(projectKey, ticketKey) });
      // The project's ticket count (PRJ-5), My Projects' open-ticket counts (PRJ-2), and later the
      // board and the list (BRD-1, LST-1) are all under PROJECTS_QUERY_KEY.
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
