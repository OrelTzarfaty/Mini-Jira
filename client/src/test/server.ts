import { ErrorCode, UNAUTHENTICATED_MESSAGE } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** Every page asks who is logged in (AUTH-4), so this one answer is the default: a visitor. */
const visitorMeHandler = http.get('/api/auth/me', () =>
  HttpResponse.json(
    { error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE } },
    { status: 401 },
  ),
);

// The mocked API for component tests. Apart from GET /api/auth/me above, each test describes
// the responses it needs with server.use(...) (or test/session.ts), so the network stays
// visible in the test itself. resetHandlers() after each test goes back to the default.
export const server = setupServer(visitorMeHandler);
