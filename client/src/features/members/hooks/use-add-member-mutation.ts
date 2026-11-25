import { memberSchema } from '@mini-jira/shared';
import type { AddMemberInput, Member } from '@mini-jira/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { projectMembersQueryKey } from '@/api/query-keys';

/**
 * Adds a registered user to the project by email (PRJ-3, owner only). Failures arrive as an
 * ApiError: 404 USER_NOT_FOUND, 409 ALREADY_MEMBER, 403 for a non-owner.
 */
export function useAddMemberMutation(
  projectKey: string,
): UseMutationResult<Member, Error, AddMemberInput> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // alert instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: (input: AddMemberInput) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}/members`, {
        method: 'POST',
        body: input,
        schema: memberSchema,
      }),
    onSuccess: () => {
      // Reloaded rather than added to the cache by hand: the server decides the order and the
      // total, and the new member may belong on a page that isn't shown yet.
      void queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(projectKey) });
    },
  });
}
