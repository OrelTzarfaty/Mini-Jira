import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY, projectQueryKey } from '@/api/query-keys';

interface DeleteProjectOptions {
  /**
   * Leaves the project's pages. Called before the cache is cleaned up, so no page of the
   * deleted project is still on screen to ask for it again (which would be a 404).
   */
  onDeleted: () => void;
}

/**
 * Deletes the project with everything in it (PRJ-5, owner only). Failures arrive as an
 * ApiError: 403 for a non-owner, 404 when it's already gone.
 */
export function useDeleteProjectMutation(
  projectKey: string,
  { onDeleted }: DeleteProjectOptions,
): UseMutationResult<undefined, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // message instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: () =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}`, {
        method: 'DELETE',
        schema: z.undefined(),
      }),
    onSuccess: () => {
      onDeleted();
      // The project and its members are gone: removed from the cache, not refreshed, since
      // refreshing them could only answer 404.
      queryClient.removeQueries({ queryKey: projectQueryKey(projectKey) });
      // My Projects and the dropdown's lists that aren't on screen are dropped, so My Projects
      // loads fresh instead of showing the deleted project for a moment; lists still on screen
      // are reloaded.
      queryClient.removeQueries({ queryKey: PROJECTS_QUERY_KEY, type: 'inactive' });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
