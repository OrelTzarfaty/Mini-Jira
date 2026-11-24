import { pageSchema, projectListItemSchema } from '@mini-jira/shared';
import type { Page, ProjectListItem } from '@mini-jira/shared';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';

const FIRST_PAGE = 1;
const projectPageSchema = pageSchema(projectListItemSchema);

// Both keys sit under PROJECTS_QUERY_KEY, so creating a project (PRJ-1) refreshes them. The
// lowercase words can't clash with a project key (projectQueryKey), which is always uppercase.
const MY_PROJECTS_QUERY_KEY = [...PROJECTS_QUERY_KEY, 'list'] as const;

function projectSearchQueryKey(
  search: string,
): readonly [...typeof PROJECTS_QUERY_KEY, 'search', string] {
  return [...PROJECTS_QUERY_KEY, 'search', search];
}

interface ProjectPageRequest {
  page: number;
  /** Matches the project name or key on the server; empty means every project. */
  search?: string;
  signal: AbortSignal;
}

/** One page of the projects the user is a member of, with their role and open tickets (PRJ-2). */
function fetchProjectPage({
  page,
  search = '',
  signal,
}: ProjectPageRequest): Promise<Page<ProjectListItem>> {
  const params = new URLSearchParams({ page: String(page) });

  if (search !== '') {
    params.set('q', search);
  }

  return apiRequest(`/projects?${params.toString()}`, { schema: projectPageSchema, signal });
}

/**
 * My Projects, 20 per page (PRJ-2). "Show more" adds the next page under the ones already shown,
 * which is what an infinite query keeps: every loaded page, refreshed together.
 */
export function useMyProjects(): UseInfiniteQueryResult<InfiniteData<Page<ProjectListItem>>> {
  return useInfiniteQuery({
    queryKey: MY_PROJECTS_QUERY_KEY,
    queryFn: ({ pageParam, signal }) => fetchProjectPage({ page: pageParam, signal }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    // Asks even when the browser thinks it is offline, so the user gets the error state with
    // "Try again" instead of a skeleton that never ends (as in useProject).
    networkMode: 'always',
  });
}

/**
 * The first page of the user's projects whose name or key contains `search`, for the project
 * dropdown (wireframe 02 E). While a new search loads, the previous results stay on screen, so
 * the list doesn't flash empty with every key press.
 */
export function useProjectSearch(search: string): UseQueryResult<Page<ProjectListItem>> {
  return useQuery({
    queryKey: projectSearchQueryKey(search),
    queryFn: ({ signal }) => fetchProjectPage({ page: FIRST_PAGE, search, signal }),
    placeholderData: keepPreviousData,
    networkMode: 'always',
  });
}
