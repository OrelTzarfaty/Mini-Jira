import { publicUserSchema } from '@mini-jira/shared';
import type { LoginInput, PublicUser } from '@mini-jira/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { startSession } from '@/features/auth/hooks/use-me';

/**
 * Logs in (AUTH-2). The API sets the HTTP-only auth cookie; the client never sees a token.
 * Failures arrive as an ApiError (api/api-error.ts).
 */
export function useLoginMutation(): UseMutationResult<PublicUser, Error, LoginInput> {
  const queryClient = useQueryClient();

  return useMutation({
    // Sends at once even when the browser thinks it is offline, so the user gets the API
    // client's "Couldn't reach the server" alert instead of a button that spins forever
    // (the same reason as in useRegisterMutation).
    networkMode: 'always',
    mutationFn: (input: LoginInput) =>
      apiRequest('/auth/login', { method: 'POST', body: input, schema: publicUserSchema }),
    onSuccess: (user) => {
      startSession(queryClient, user);
    },
  });
}
