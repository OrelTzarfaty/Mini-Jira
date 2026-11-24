import { projectSchema } from '@mini-jira/shared';
import type { Project } from '@mini-jira/shared';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { createContext, use } from 'react';

import { apiRequest } from '@/api/client';
import { projectQueryKey } from '@/api/query-keys';

/**
 * One project and the caller's role in it (PRJ-6). A missing project and a project the user
 * isn't a member of both fail with 404 NOT_FOUND; the query client never retries a 4xx.
 */
export function useProject(projectKey: string): UseQueryResult<Project> {
  return useQuery({
    queryKey: projectQueryKey(projectKey),
    queryFn: ({ signal }) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}`, { schema: projectSchema, signal }),
    // Asks even when the browser thinks it is offline, so the user gets an error with
    // "Try again" instead of a loading state that never ends (as in useMe).
    networkMode: 'always',
  });
}

/**
 * The loaded project, given to the pages by ProjectLayout. A context rather than a second
 * useProject() call in each page: that would mount a new query observer and fetch the project
 * again right after the layout loaded it.
 */
export const CurrentProjectContext = createContext<Project | null>(null);

/**
 * The project of the current URL, for pages under ProjectLayout: it renders them only once the
 * project is loaded, so a missing project here is a programming mistake, not a state to handle.
 */
export function useCurrentProject(): Project {
  const project = use(CurrentProjectContext);

  if (!project) {
    throw new Error('useCurrentProject must be used under ProjectLayout');
  }

  return project;
}
