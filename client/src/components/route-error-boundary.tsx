import type { ReactElement } from 'react';

import { DocumentTitle } from '@/components/document-title';
import { ErrorState } from '@/components/error-state';

function reloadPage(): void {
  window.location.reload();
}

/**
 * Shown instead of a blank screen when a page crashes while rendering. React Router logs
 * the error to the console; the user never sees its details.
 */
export function RouteErrorBoundary(): ReactElement {
  return (
    <div className="space-y-4">
      <DocumentTitle title="Something went wrong" />
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <ErrorState message="This page couldn't be shown." onRetry={reloadPage} />
    </div>
  );
}

/** The last resort, for an error in a page layout itself: the same message in its own <main>. */
export function RootErrorBoundary(): ReactElement {
  return (
    <main id="main-content" className="p-4 sm:p-6">
      <RouteErrorBoundary />
    </main>
  );
}
