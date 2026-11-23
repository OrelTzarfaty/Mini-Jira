import type { ReactElement, ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';

import { ErrorState } from '@/components/error-state';
import { PageSkeleton } from '@/components/page-skeleton';
import { useMe } from '@/features/auth/hooks/use-me';

const LOADING_LABEL = 'Loading your account';
const ERROR_MESSAGE = "Couldn't load your account.";

/** The page area for the waiting and error states, before the top bar can show who is logged in. */
function SessionCheckFrame({ children }: { children: ReactNode }): ReactElement {
  return (
    <main id="main-content" className="min-h-svh px-4 py-6 sm:px-6">
      {children}
    </main>
  );
}

/**
 * Guards every screen after login (architecture §5.2, AUTH-4). It waits for GET /api/auth/me,
 * then shows the page, or sends a visitor to /login. A user it already knows never sees the
 * loading state again: background checks keep showing the page.
 */
export function ProtectedRoute(): ReactElement {
  const meQuery = useMe();
  const user = meQuery.data;

  if (user === null) {
    // replace: Back must not return to a page that would only redirect again.
    return <Navigate to="/login" replace />;
  }

  if (user) {
    return <Outlet />;
  }

  // "Try again" shows the loading state while it asks, so the click visibly does something.
  if (meQuery.isError && !meQuery.isFetching) {
    return (
      <SessionCheckFrame>
        <ErrorState
          message={ERROR_MESSAGE}
          onRetry={() => {
            void meQuery.refetch();
          }}
        />
      </SessionCheckFrame>
    );
  }

  return (
    <SessionCheckFrame>
      <PageSkeleton label={LOADING_LABEL} />
    </SessionCheckFrame>
  );
}
