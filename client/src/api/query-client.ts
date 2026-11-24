import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, isUnauthenticatedError } from './api-error';
import { ME_QUERY_KEY } from './query-keys';

// TanStack Query's own default.
const MAX_RETRIES = 3;

/**
 * Retries network and server errors, but not 4xx answers: a 401, 403, or 404 would come
 * back the same, and retrying would only delay the error state by several seconds.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;

  return !isClientError && failureCount < MAX_RETRIES;
}

/**
 * A 401 UNAUTHENTICATED from any request means the session ended while the app was open (the
 * cookie expired or was removed). Marking the current user as logged out lets ProtectedRoute
 * send them to /login (AUTH-4). Login's wrong password has another code, so it never ends up here.
 */
function endSessionOnUnauthenticated(queryClient: QueryClient, error: Error): void {
  if (isUnauthenticatedError(error)) {
    queryClient.setQueryData(ME_QUERY_KEY, null);
  }
}

/** The cache for all server data (docs/architecture.md §5.3). */
export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        endSessionOnUnauthenticated(queryClient, error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        endSessionOnUnauthenticated(queryClient, error);
      },
    }),
    defaultOptions: {
      queries: { retry: shouldRetry },
    },
  });

  return queryClient;
}
