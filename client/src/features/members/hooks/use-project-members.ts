import { memberPageSchema } from '@mini-jira/shared';
import type { MemberPage } from '@mini-jira/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { projectMembersQueryKey } from '@/api/query-keys';

const FIRST_PAGE = 1;

/**
 * A project's members, 20 per page (PRJ-3, LST-4). An infinite query: "Show more" adds the next
 * page under the ones already shown, and refreshing it reloads every page shown.
 */
export function useProjectMembers(
  projectKey: string,
): UseInfiniteQueryResult<InfiniteData<MemberPage, number>> {
  return useInfiniteQuery({
    queryKey: projectMembersQueryKey(projectKey),
    queryFn: ({ pageParam, signal }) =>
      apiRequest(`/projects/${encodeURIComponent(projectKey)}/members?page=${String(pageParam)}`, {
        schema: memberPageSchema,
        signal,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    // Asks even when the browser thinks it is offline, so the user gets an error with
    // "Try again" instead of a loading state that never ends (as in useProject).
    networkMode: 'always',
  });
}
