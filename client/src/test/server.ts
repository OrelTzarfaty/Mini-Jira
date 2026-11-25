import { ErrorCode, PAGE_SIZE, UNAUTHENTICATED_MESSAGE } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** Every page asks who is logged in (AUTH-4), so this one answer is the default: a visitor. */
export const visitorMeHandler = http.get('/api/auth/me', () =>
  HttpResponse.json(
    { error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE } },
    { status: 401 },
  ),
);

/**
 * The project dropdown in the top bar (PRJ-2) and My Projects list the user's projects, so a
 * logged-in screen asks for them. The default is a user without projects; test/project.ts
 * (mockMyProjects) gives a test its own.
 */
export const noProjectsHandler = http.get('/api/projects', () =>
  HttpResponse.json({ items: [], page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 }),
);

// The mocked API for component tests. Apart from the defaults above, each test describes the
// responses it needs with server.use(...) (or test/session.ts), so the network stays visible in
// the test itself. resetHandlers() after each test goes back to the defaults.
export const server = setupServer(visitorMeHandler, noProjectsHandler);
