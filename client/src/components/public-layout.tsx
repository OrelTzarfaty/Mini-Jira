import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

/** The page frame for screens without the app's top bar: the landing page and "not found". */
export function PublicLayout(): ReactElement {
  return (
    <main id="main-content" className="p-4 sm:p-6">
      <Outlet />
    </main>
  );
}
