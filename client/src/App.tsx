import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createQueryClient } from '@/api/query-client';
import { routes } from '@/routes';

// Both are created once, outside React: the cache must outlive any one screen, and React
// Router's data mode requires a router made outside the component tree.
const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
