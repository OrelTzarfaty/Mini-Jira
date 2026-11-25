import { projectDetailSchema } from '@mini-jira/shared';
import type { ProjectDetail, UpdateProjectInput } from '@mini-jira/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY, projectQueryKey } from '@/api/query-keys';

/**
 * Changes the project's name and description (PRJ-5, owner only). Failures arrive as an
 * ApiError: 400 VALIDATION_ERROR with field details, 403 for a non-owner, 404 when it's gone.
 */
export function useUpdateProjectMutation(
  projectKey: string,
): UseMutationResult<ProjectDetail, Error, UpdateProjectInput> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // alert instead of a button that keeps spinning (same as the other forms).
    networkMode: 'always',
    mutationFn: (input: UpdateProjectInput) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}`, {
        method: 'PATCH',
        body: input,
        schema: projectDetailSchema,
      }),
    onSuccess: (project) => {
      // The answer is the whole project, so the header and the form show it without a reload.
      queryClient.setQueryData(projectQueryKey(projectKey), project);
      // My Projects and the project dropdown show the name too (PRJ-2). This project's own
      // queries (the one just set and its members) are skipped: nothing else in them changed.
      void queryClient.invalidateQueries({
        queryKey: PROJECTS_QUERY_KEY,
        predicate: (query) => query.queryKey[1] !== projectKey,
      });
    },
  });
}
