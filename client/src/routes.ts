import type { RouteObject } from 'react-router';

import { AppShell } from '@/components/app-shell';
import { NotFoundPage } from '@/components/not-found-page';
import { PublicLayout } from '@/components/public-layout';
import { RootErrorBoundary, RouteErrorBoundary } from '@/components/route-error-boundary';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { LandingPage } from '@/features/auth/pages/landing-page';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { BoardPage } from '@/features/board/pages/board-page';
import { ListPage } from '@/features/list/pages/list-page';
import { MyWorkPage } from '@/features/my-work/pages/my-work-page';
import { ProjectLayout } from '@/features/projects/components/project-layout';
import { MyProjectsPage } from '@/features/projects/pages/my-projects-page';
import { ProjectSettingsPage } from '@/features/projects/pages/project-settings-page';
import { TicketPage } from '@/features/tickets/pages/ticket-page';

// Every screen's URL (docs/architecture.md §5.2).
export const routes: RouteObject[] = [
  {
    ErrorBoundary: RootErrorBoundary,
    children: [
      // The landing page draws its own top bar, full-screen photo, and footer (wireframe 01),
      // so it sits outside PublicLayout. A crash in it falls back to RootErrorBoundary.
      // /login and /register are its children: the page stays mounted under the popup (AUTH-1/2).
      {
        path: '/',
        Component: LandingPage,
        children: [
          { path: 'login', Component: LoginPage },
          { path: 'register', Component: RegisterPage },
        ],
      },
      {
        Component: PublicLayout,
        children: [
          {
            // Errors inside a page show up inside the layout, which keeps working.
            ErrorBoundary: RouteErrorBoundary,
            children: [{ path: '*', Component: NotFoundPage }],
          },
        ],
      },
      {
        // Every screen after login: a visitor goes to /login (AUTH-4).
        Component: ProtectedRoute,
        children: [
          {
            Component: AppShell,
            children: [
              {
                ErrorBoundary: RouteErrorBoundary,
                children: [
                  { path: '/projects', Component: MyProjectsPage },
                  {
                    // Loads the project before any of its pages: a non-member or a missing
                    // project gets "Project not found" (PRJ-6).
                    path: '/projects/:projectKey',
                    Component: ProjectLayout,
                    children: [
                      // /projects/WEB alone is no screen (architecture §5.2).
                      { index: true, Component: NotFoundPage },
                      { path: 'board', Component: BoardPage },
                      { path: 'list', Component: ListPage },
                      { path: 'tickets/:ticketKey', Component: TicketPage },
                      { path: 'settings', Component: ProjectSettingsPage },
                    ],
                  },
                  { path: '/my-work', Component: MyWorkPage },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
