import { ErrorCode, healthResponseSchema } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { z } from 'zod';

import { ApiError, ClientErrorCode, NO_RESPONSE_STATUS } from './api-error';
import { apiRequest } from './client';

import { server } from '@/test/server';

async function catchApiError(request: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await request.catch((caught: unknown) => caught);

  if (!(error instanceof ApiError)) {
    throw new Error(`Expected an ApiError, got: ${String(error)}`);
  }

  return error;
}

describe('apiRequest', () => {
  it('SETUP-5: returns the checked response body and sends the auth cookie', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })));
    // MSW in Node doesn't keep the request's credentials mode, so read it from the fetch call.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const health = await apiRequest('/health', { schema: healthResponseSchema });

    expect(health).toEqual({ status: 'ok' });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('SETUP-5: sends the body as JSON', async () => {
    let received: { contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/projects', async ({ request }) => {
        received = { contentType: request.headers.get('Content-Type'), body: await request.json() };

        return HttpResponse.json({ key: 'WEB' }, { status: 201 });
      }),
    );

    const project = await apiRequest('/projects', {
      method: 'POST',
      body: { name: 'Website Redesign', key: 'WEB' },
      schema: z.object({ key: z.string() }),
    });

    expect(project).toEqual({ key: 'WEB' });
    expect(received).toEqual({
      contentType: 'application/json',
      body: { name: 'Website Redesign', key: 'WEB' },
    });
  });

  it('SETUP-5: returns undefined for 204 No Content', async () => {
    server.use(http.delete('/api/projects/WEB', () => new HttpResponse(null, { status: 204 })));

    const result = await apiRequest('/projects/WEB', { method: 'DELETE', schema: z.undefined() });

    expect(result).toBeUndefined();
  });

  it("SETUP-5: turns the API's error format into an ApiError with the field details", async () => {
    server.use(
      http.post('/api/projects', () =>
        HttpResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Name is required',
              details: [{ field: 'name', message: 'Required' }],
            },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await catchApiError(
      apiRequest('/projects', { method: 'POST', body: {}, schema: z.unknown() }),
    );

    expect(error).toMatchObject({
      status: 400,
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Name is required',
      details: [{ field: 'name', message: 'Required' }],
    });
  });

  it('SETUP-5: an error without field details has an empty details list', async () => {
    server.use(
      http.get('/api/projects/WEB', () =>
        HttpResponse.json(
          { error: { code: ErrorCode.NOT_FOUND, message: 'Project not found' } },
          { status: 404 },
        ),
      ),
    );

    const error = await catchApiError(apiRequest('/projects/WEB', { schema: z.unknown() }));

    expect(error).toMatchObject({ status: 404, code: ErrorCode.NOT_FOUND, details: [] });
  });

  it('SETUP-5: an error page that is not JSON becomes UNEXPECTED_RESPONSE', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.html('<h1>502 Bad Gateway</h1>', { status: 502 })),
    );

    const error = await catchApiError(apiRequest('/health', { schema: healthResponseSchema }));

    expect(error).toMatchObject({
      status: 502,
      code: ClientErrorCode.UNEXPECTED_RESPONSE,
      message: 'Something went wrong. Please try again.',
    });
  });

  it('SETUP-5: a success response with the wrong shape becomes UNEXPECTED_RESPONSE', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'starting' })));

    const error = await catchApiError(apiRequest('/health', { schema: healthResponseSchema }));

    expect(error).toMatchObject({ status: 200, code: ClientErrorCode.UNEXPECTED_RESPONSE });
  });

  it('SETUP-5: no response at all becomes NETWORK_ERROR', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));

    const error = await catchApiError(apiRequest('/health', { schema: healthResponseSchema }));

    expect(error).toMatchObject({
      status: NO_RESPONSE_STATUS,
      code: ClientErrorCode.NETWORK_ERROR,
      message: "Couldn't reach the server. Check your connection and try again.",
    });
  });

  it('SETUP-5: a cancelled request rejects with the abort error, not an ApiError', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })));
    const controller = new AbortController();
    controller.abort();

    const error: unknown = await apiRequest('/health', {
      schema: healthResponseSchema,
      signal: controller.signal,
    }).catch((caught: unknown) => caught);

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toHaveProperty('name', 'AbortError');
  });
});

describe('apiRequest when the session is missing or expired (401)', () => {
  // jsdom can't load another page, so the test records where the app asked the browser to go.
  function stubCurrentPage(pathname: string): Mock<(url: string) => void> {
    const replace = vi.fn<(url: string) => void>();
    vi.stubGlobal('location', { ...window.location, pathname, replace });

    return replace;
  }

  function respondUnauthenticated(): void {
    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json(
          { error: { code: ErrorCode.UNAUTHENTICATED, message: 'Please log in' } },
          { status: 401 },
        ),
      ),
    );
  }

  it('SETUP-5: sends the user from a protected page to /login', async () => {
    const replace = stubCurrentPage('/projects/WEB/board');
    respondUnauthenticated();

    const error = await catchApiError(apiRequest('/projects', { schema: z.unknown() }));

    expect(replace).toHaveBeenCalledExactlyOnceWith('/login');
    expect(error).toMatchObject({ status: 401, code: ErrorCode.UNAUTHENTICATED });
  });

  it.each(['/', '/login', '/register'])(
    'SETUP-5: stays on the public page %s, where a 401 is expected',
    async (pathname) => {
      const replace = stubCurrentPage(pathname);
      respondUnauthenticated();

      const error = await catchApiError(apiRequest('/projects', { schema: z.unknown() }));

      expect(replace).not.toHaveBeenCalled();
      expect(error).toMatchObject({ status: 401 });
    },
  );

  it('SETUP-5: also redirects when the 401 response is not in the API error format', async () => {
    const replace = stubCurrentPage('/my-work');
    server.use(http.get('/api/projects', () => new HttpResponse('Unauthorized', { status: 401 })));

    await catchApiError(apiRequest('/projects', { schema: z.unknown() }));

    expect(replace).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('SETUP-5: other errors, such as 403, never redirect', async () => {
    const replace = stubCurrentPage('/projects/WEB/settings');
    server.use(
      http.get('/api/projects', () =>
        HttpResponse.json(
          { error: { code: ErrorCode.FORBIDDEN, message: 'Only the owner can do this' } },
          { status: 403 },
        ),
      ),
    );

    await catchApiError(apiRequest('/projects', { schema: z.unknown() }));

    expect(replace).not.toHaveBeenCalled();
  });
});
