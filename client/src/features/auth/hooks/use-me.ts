import { publicUserSchema } from '@mini-jira/shared';
import type { PublicUser } from '@mini-jira/shared';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';

import { isUnauthenticatedError } from '@/api/api-error';
import { apiRequest } from '@/api/client';
import { ME_QUERY_KEY } from '@/api/query-keys';

/** The logged-in user, or null for a visitor. "Not logged in" is a normal answer, not an error. */
async function fetchMe({ signal }: { signal: AbortSignal }): Promise<PublicUser | null> {
  try {
    return await apiRequest('/auth/me', { schema: publicUserSchema, signal });
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Who is logged in (AUTH-4). The HTTP-only cookie survives a page refresh, but JavaScript can't
 * read it, so the app asks the API once when it starts. Network and server errors stay errors.
 */
export function useMe(): UseQueryResult<PublicUser | null> {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    // The answer only changes when the user logs in, registers, or logs out (each updates or
    // clears this cache), or when the session ends, which any request's 401 reports. So there
    // is no reason to ask again every time a page mounts or the window gets focus.
    staleTime: Infinity,
    // Asks even when the browser thinks it is offline, so the user gets an error with
    // "Try again" instead of a loading state that never ends (as in useLoginMutation).
    networkMode: 'always',
  });
}

/**
 * Called after a successful login or register. Drops whatever an earlier session left in the
 * cache, so the new user never sees the old user's data, and stores the new user, so the
 * protected page opens at once without asking /auth/me again.
 */
export function startSession(queryClient: QueryClient, user: PublicUser): void {
  queryClient.removeQueries();
  queryClient.setQueryData(ME_QUERY_KEY, user);
}
