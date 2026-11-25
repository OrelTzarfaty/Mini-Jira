import { projectDetailSchema } from '@mini-jira/shared';
import type { ProjectDetail } from '@mini-jira/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { createContext, use } from 'react';

import { apiRequest } from '@/api/client';
import { projectQueryKey } from '@/api/query-keys';

/**
 * How to load one project, the caller's role in it (PRJ-6), and its ticket count (PRJ-5). A
 * missing project and a project the user isn't a member of both fail with 404 NOT_FOUND; the
 * query client never retries a 4xx.
 */
function projectQueryOptions(projectKey: string) {
  return queryOptions({
    queryKey: projectQueryKey(projectKey),
    queryFn: ({ signal }) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}`, {
        schema: projectDetailSchema,
        signal,
      }),
    // Asks even when the browser thinks it is offline, so the user gets an error with
    // "Try again" instead of a loading state that never ends (as in useMe).
    networkMode: 'always',
  });
}

/** One project and the caller's role in it (PRJ-6). */
export function useProject(projectKey: string): UseQueryResult<ProjectDetail> {
  return useQuery(projectQueryOptions(projectKey));
}

/**
 * The same project for UI that is on screen with and without one, such as the top bar's project
 * dropdown (PRJ-2): undefined when `projectKey` is, and while the project loads or if it fails.
 * It shares useProject's cache, so it sends no request of its own inside a project.
 */
export function useOptionalProject(projectKey: string | undefined): ProjectDetail | undefined {
  const { data } = useQuery({
    // The empty key is never fetched: `enabled` is false whenever it is used.
    ...projectQueryOptions(projectKey ?? ''),
    enabled: projectKey !== undefined,
  });

  return projectKey === undefined ? undefined : data;
}

/**
 * The loaded project, given to the pages by ProjectLayout. A context rather than a second
 * useProject() call in each page: that would mount a new query observer and fetch the project
 * again right after the layout loaded it.
 */
export const CurrentProjectContext = createContext<ProjectDetail | null>(null);

/**
 * The project of the current URL, for pages under ProjectLayout: it renders them only once the
 * project is loaded, so a missing project here is a programming mistake, not a state to handle.
 */
export function useCurrentProject(): ProjectDetail {
  const project = use(CurrentProjectContext);

  if (!project) {
    throw new Error('useCurrentProject must be used under ProjectLayout');
  }

  return project;
}
