import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { createQueryClient } from '@/api/query-client';
import { routes as appRoutes } from '@/routes';

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

interface RenderRouteOptions {
  /** A cache the test made itself, to put data in it first or check it afterwards (AUTH-3). */
  queryClient?: QueryClient;
}

/**
 * Renders the app's routes (or the given ones) as if the browser had opened `path`, with a
 * fresh query cache, so no test sees another test's data. Returns the router, so a test can
 * check where the app went (router.state.location).
 */
export function renderRoute(
  path: string,
  routes: RouteObject[] = appRoutes,
  { queryClient = createQueryClient() }: RenderRouteOptions = {},
): MemoryRouter {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}
