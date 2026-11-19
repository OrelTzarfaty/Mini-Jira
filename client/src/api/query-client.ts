import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-error';

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

/** The cache for all server data (docs/architecture.md §5.3). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
    },
  });
}
