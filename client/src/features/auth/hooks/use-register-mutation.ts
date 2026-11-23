import { publicUserSchema } from '@mini-jira/shared';
import type { PublicUser, RegisterInput } from '@mini-jira/shared';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';

/**
 * Creates the account (AUTH-1). The API also sets the auth cookie, so the new user is logged in.
 * Failures arrive as an ApiError (api/api-error.ts).
 */
export function useRegisterMutation(): UseMutationResult<PublicUser, Error, RegisterInput> {
  return useMutation({
    // TanStack Query pauses mutations while the browser is offline (networkMode 'online'), which
    // left the button spinning with no message. 'always' sends at once, so an offline user gets
    // the API client's "Couldn't reach the server" alert and can try again.
    networkMode: 'always',
    mutationFn: (input: RegisterInput) =>
      apiRequest('/auth/register', { method: 'POST', body: input, schema: publicUserSchema }),
  });
}
