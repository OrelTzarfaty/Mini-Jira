import type { PublicUser } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { server, visitorMeHandler } from './server';

/** The user that logged-in tests use (wireframe 02 F). */
export const TEST_USER: PublicUser = {
  id: '6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b',
  name: 'Dana Levi',
  email: 'dana@example.com',
};

/** Makes GET /api/auth/me answer with the user, as if the browser held a valid session (AUTH-4). */
export function mockLoggedIn(user: PublicUser = TEST_USER): void {
  server.use(http.get('/api/auth/me', () => HttpResponse.json(user)));
}

/** Makes GET /api/auth/me answer 401 again, as after the API cleared the cookie (logout). */
export function mockLoggedOut(): void {
  server.use(visitorMeHandler);
}
