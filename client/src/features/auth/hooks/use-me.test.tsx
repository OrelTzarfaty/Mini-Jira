import { ErrorCode } from '@mini-jira/shared';
import type { PublicUser } from '@mini-jira/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { ME_QUERY_KEY } from '@/api/query-keys';
import { startSession, useMe } from '@/features/auth/hooks/use-me';
import { server } from '@/test/server';
import { mockLoggedIn, TEST_USER } from '@/test/session';

function renderUseMe(
  queryClient: QueryClient = createQueryClient(),
): RenderHookResult<UseQueryResult<PublicUser | null>, unknown> {
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return renderHook(() => useMe(), { wrapper: Wrapper });
}

describe('useMe', () => {
  it('AUTH-4: a valid session gives the logged-in user', async () => {
    mockLoggedIn();

    const { result } = renderUseMe();

    await waitFor(() => {
      expect(result.current.data).toEqual(TEST_USER);
    });
  });

  it('AUTH-4: 401 UNAUTHENTICATED gives null, a normal "logged out" answer, not an error', async () => {
    const { result } = renderUseMe();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
  });

  it('AUTH-4: other failures, such as a 403, stay errors', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json(
          { error: { code: ErrorCode.FORBIDDEN, message: 'Forbidden' } },
          { status: 403 },
        ),
      ),
    );

    const { result } = renderUseMe();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 403, code: ErrorCode.FORBIDDEN });
  });

  it("AUTH-4: startSession drops the old session's data and stores the new user", () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['projects'], [{ key: 'OLD' }]);

    startSession(queryClient, TEST_USER);

    expect(queryClient.getQueryData(['projects'])).toBeUndefined();
    expect(queryClient.getQueryData(ME_QUERY_KEY)).toEqual(TEST_USER);
  });
});
