import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

import { TopBar } from '@/components/top-bar';

/** The page frame for every screen after login: a skip link, the top bar, and the page. */
export function AppShell(): ReactElement {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Lets keyboard users jump past the top bar (WCAG 2.4.1). Hidden until focused; its box
          styles use focus: because sr-only and not-sr-only reset padding and border. */}
      <a
        href="#main-content"
        className="sr-only outline-none focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Skip to main content
      </a>
      <TopBar />
      {/* tabIndex -1 lets the skip link move focus here. */}
      <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
