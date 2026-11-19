import type { ReactElement } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { routes } from '@/routes';

// Created once, outside React, as React Router's data mode requires.
const router = createBrowserRouter(routes);

export function App(): ReactElement {
  return <RouterProvider router={router} />;
}
