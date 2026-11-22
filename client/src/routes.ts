import type { RouteObject } from 'react-router';

import { AppShell } from '@/components/app-shell';
import { NotFoundPage } from '@/components/not-found-page';
import { PublicLayout } from '@/components/public-layout';
import { RootErrorBoundary, RouteErrorBoundary } from '@/components/route-error-boundary';
import { LandingPage } from '@/features/auth/pages/landing-page';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { BoardPage } from '@/features/board/pages/board-page';
import { ListPage } from '@/features/list/pages/list-page';
import { MyWorkPage } from '@/features/my-work/pages/my-work-page';
import { MyProjectsPage } from '@/features/projects/pages/my-projects-page';
import { ProjectSettingsPage } from '@/features/projects/pages/project-settings-page';
import { TicketPage } from '@/features/tickets/pages/ticket-page';

// Every screen's URL (docs/architecture.md §5.2). The login guard comes in AUTH-4.
export const routes: RouteObject[] = [
  {
    ErrorBoundary: RootErrorBoundary,
    children: [
      // The landing page draws its own top bar, full-screen photo, and footer (wireframe 01),
      // so it sits outside PublicLayout. A crash in it falls back to RootErrorBoundary.
      { path: '/', Component: LandingPage },
      {
        Component: PublicLayout,
        children: [
          {
            // Errors inside a page show up inside the layout, which keeps working.
            ErrorBoundary: RouteErrorBoundary,
            children: [
              { path: '/login', Component: LoginPage },
              { path: '/register', Component: RegisterPage },
              { path: '*', Component: NotFoundPage },
            ],
          },
        ],
      },
      {
        Component: AppShell,
        children: [
          {
            ErrorBoundary: RouteErrorBoundary,
            children: [
              { path: '/projects', Component: MyProjectsPage },
              { path: '/projects/:projectKey/board', Component: BoardPage },
              { path: '/projects/:projectKey/list', Component: ListPage },
              { path: '/projects/:projectKey/tickets/:ticketKey', Component: TicketPage },
              { path: '/projects/:projectKey/settings', Component: ProjectSettingsPage },
              { path: '/my-work', Component: MyWorkPage },
            ],
          },
        ],
      },
    ],
  },
];
