import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';

import { routes as appRoutes } from '@/routes';

/** Renders the app's routes (or the given ones) as if the browser had opened `path`. */
export function renderRoute(path: string, routes: RouteObject[] = appRoutes): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(<RouterProvider router={router} />);
}
