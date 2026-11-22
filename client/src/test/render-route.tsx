import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { routes as appRoutes } from '@/routes';

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

/**
 * Renders the app's routes (or the given ones) as if the browser had opened `path`. Returns the
 * router, so a test can check where the app went (router.state.location).
 */
export function renderRoute(path: string, routes: RouteObject[] = appRoutes): MemoryRouter {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(<RouterProvider router={router} />);

  return router;
}
