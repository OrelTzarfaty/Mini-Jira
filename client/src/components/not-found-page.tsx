import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Button } from '@/components/ui/button';

/** Shown for any URL that matches no route. */
export function NotFoundPage(): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <DocumentTitle title="Page not found" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        The link may be wrong, or the page may have been removed.
      </p>
      <Button asChild className="mt-2">
        <Link to="/">Go to the home page</Link>
      </Button>
    </div>
  );
}
