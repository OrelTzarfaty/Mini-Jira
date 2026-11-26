import { memberPageSchema } from '@mini-jira/shared';
import type { Member, MemberPage } from '@mini-jira/shared';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { projectMembersQueryKey } from '@/api/query-keys';

function fetchMemberPage(
  projectKey: string,
  page: number,
  signal: AbortSignal,
): Promise<MemberPage> {
  return apiRequest(`/projects/${encodeURIComponent(projectKey)}/members?page=${String(page)}`, {
    schema: memberPageSchema,
    signal,
  });
}

/**
 * Every member of the project, for the assignee picker (TKT-5): a picker that stopped at the
 * first 20 would hide the others without saying so. The API pages the list (LST-4), so this asks
 * for the first page and then for the rest at the same time. A single query, not the members
 * list's "Show more" one, so loading every page needs no effect (standards §8.3). Under the
 * members' key, so adding or removing a member refreshes it too.
 */
export function useAllProjectMembers(projectKey: string): UseQueryResult<Member[]> {
  return useQuery({
    queryKey: [...projectMembersQueryKey(projectKey), 'all'],
    queryFn: async ({ signal }) => {
      const firstPage = await fetchMemberPage(projectKey, 1, signal);
      const otherPages = await Promise.all(
        Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
          fetchMemberPage(projectKey, index + 2, signal),
        ),
      );
      const members = [firstPage, ...otherPages].flatMap((page) => page.items);

      // A member added between two page requests can shift the pages and show up twice.
      return [...new Map(members.map((member) => [member.userId, member])).values()];
    },
    // Asks even when the browser thinks it is offline, so the user gets an error with
    // "Try again" instead of a loading state that never ends (as in useProjectMembers).
    networkMode: 'always',
  });
}
