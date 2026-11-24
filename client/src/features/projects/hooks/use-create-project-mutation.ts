import { projectSchema } from '@mini-jira/shared';
import type { CreateProjectInput, Project } from '@mini-jira/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';

/**
 * Creates a project; the API makes the caller its owner (PRJ-1). Failures arrive as an ApiError
 * (api/api-error.ts).
 */
export function useCreateProjectMutation(): UseMutationResult<Project, Error, CreateProjectInput> {
  const queryClient = useQueryClient();

  return useMutation({
    // Send at once even offline, so the user gets the API client's "Couldn't reach the server"
    // alert instead of a button that keeps spinning (same as the auth forms).
    networkMode: 'always',
    mutationFn: (input: CreateProjectInput) =>
      apiRequest('/projects', { method: 'POST', body: input, schema: projectSchema }),
    onSuccess: () => {
      // The new project belongs in My Projects and the project dropdown (PRJ-2).
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
