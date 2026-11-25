import { ErrorCode } from '@mini-jira/shared';
import type { Member } from '@mini-jira/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError } from '@/api/api-error';
import { apiRequest } from '@/api/client';
import { projectMembersQueryKey } from '@/api/query-keys';

/**
 * Removes a member from the project (PRJ-4, owner only). Failures arrive as an ApiError:
 * 404 NOT_FOUND when they were already removed, 409 CANNOT_REMOVE_OWNER, 403 for a non-owner.
 */
export function useRemoveMemberMutation(
  projectKey: string,
): UseMutationResult<undefined, Error, Member> {
  const queryClient = useQueryClient();
  const reloadMembers = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(projectKey) });

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // message instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: (member: Member) =>
      apiRequest(
        `/projects/${encodeURIComponent(projectKey)}/members/${encodeURIComponent(member.userId)}`,
        { method: 'DELETE', schema: z.undefined() },
      ),
    // Returned, so the mutation stays pending until the list has reloaded: the dialog closes
    // when the row is already gone, and focus never lands on a button that is about to vanish.
    onSuccess: reloadMembers,
    onError: (error) => {
      // Someone else already removed them: the list the owner sees is out of date.
      if (error instanceof ApiError && error.code === ErrorCode.NOT_FOUND) {
        void reloadMembers();
      }
    },
  });
}
