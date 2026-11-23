import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { apiRequest } from '@/api/client';

/**
 * Logs out (AUTH-3). The API clears the HTTP-only auth cookie and answers 204 with no body.
 * On success it empties the query cache, so the next person on this browser never sees the
 * old user's projects or tickets, and goes to the landing page. On failure the user is still
 * logged in: the error is the caller's to show.
 */
export function useLogoutMutation(): UseMutationResult<undefined, Error, void> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    // Sends at once even when the browser thinks it is offline, so the user gets an error
    // instead of a button that waits forever (the same reason as in useLoginMutation).
    networkMode: 'always',
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST', schema: z.undefined() }),
    onSuccess: () => {
      queryClient.clear();
      // replace: Back shouldn't return to a page of the session that just ended.
      void navigate('/', { replace: true });
    },
  });
}
