import { ErrorCode, healthResponseSchema } from '@mini-jira/shared';
import { MutationObserver, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError, ClientErrorCode, NO_RESPONSE_STATUS } from './api-error';
import { apiRequest } from './client';
import { createQueryClient, shouldRetry } from './query-client';
import { ME_QUERY_KEY } from './query-keys';

import { server } from '@/test/server';
import { TEST_USER } from '@/test/session';

// A screen that loads data the way every feature will: useQuery + apiRequest.
function HealthStatus(): ReactElement {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiRequest('/health', { schema: healthResponseSchema, signal }),
  });

  if (health.status === 'pending') {
    return <p>Loading</p>;
  }

  if (health.status === 'error') {
    return <p role="alert">{health.error.message}</p>;
  }

  return <p>API is {health.data.status}</p>;
}

function renderWithQueryClient(ui: ReactElement): void {
  render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
}

function apiError(status: number): ApiError {
  return new ApiError({ status, code: ErrorCode.INTERNAL_ERROR, message: 'Failed' });
}

describe('createQueryClient', () => {
  it('SETUP-5: gives screens the loaded data', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })));

    renderWithQueryClient(<HealthStatus />);

    expect(await screen.findByText('API is ok')).toBeInTheDocument();
  });

  it('SETUP-5: shows a 4xx error right away, after a single request', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/health', () => {
        requestCount += 1;

        return HttpResponse.json(
          { error: { code: ErrorCode.NOT_FOUND, message: 'Not found' } },
          { status: 404 },
        );
      }),
    );

    renderWithQueryClient(<HealthStatus />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Not found');
    expect(requestCount).toBe(1);
  });
});

describe('shouldRetry', () => {
  it.each([400, 401, 403, 404, 409])('SETUP-5: never retries a %i answer', (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(false);
  });

  it('SETUP-5: retries server errors up to 3 times', () => {
    expect(shouldRetry(0, apiError(500))).toBe(true);
    expect(shouldRetry(2, apiError(500))).toBe(true);
    expect(shouldRetry(3, apiError(500))).toBe(false);
  });

  it('SETUP-5: retries when the server could not be reached', () => {
    const networkError = new ApiError({
      status: NO_RESPONSE_STATUS,
      code: ClientErrorCode.NETWORK_ERROR,
      message: 'Offline',
    });

    expect(shouldRetry(0, networkError)).toBe(true);
  });
});

describe('createQueryClient when the session ends (401)', () => {
  function apiErrorWithCode(code: ErrorCode): ApiError {
    return new ApiError({ status: 401, code, message: 'Not allowed' });
  }

  function loggedInQueryClient(): QueryClient {
    const queryClient = createQueryClient();
    queryClient.setQueryData(ME_QUERY_KEY, TEST_USER);

    return queryClient;
  }

  it('AUTH-4: a query that gets 401 UNAUTHENTICATED marks the user as logged out', async () => {
    const queryClient = loggedInQueryClient();

    await queryClient
      .fetchQuery({
        queryKey: ['projects'],
        queryFn: () => Promise.reject(apiErrorWithCode(ErrorCode.UNAUTHENTICATED)),
      })
      .catch(() => undefined);

    expect(queryClient.getQueryData(ME_QUERY_KEY)).toBeNull();
  });

  it('AUTH-4: a mutation that gets 401 UNAUTHENTICATED marks the user as logged out', async () => {
    const queryClient = loggedInQueryClient();
    const mutation = new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(apiErrorWithCode(ErrorCode.UNAUTHENTICATED)),
    });

    await mutation.mutate().catch(() => undefined);

    expect(queryClient.getQueryData(ME_QUERY_KEY)).toBeNull();
  });

  it("AUTH-4: login's 401 INVALID_CREDENTIALS never logs anyone out", async () => {
    const queryClient = loggedInQueryClient();
    const mutation = new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(apiErrorWithCode(ErrorCode.INVALID_CREDENTIALS)),
    });

    await mutation.mutate().catch(() => undefined);

    expect(queryClient.getQueryData(ME_QUERY_KEY)).toEqual(TEST_USER);
  });
});
