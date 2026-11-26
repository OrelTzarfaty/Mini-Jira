import { ArrowLeftIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Button } from '@/components/ui/button';

const DETAIL_PLACEHOLDER_COUNT = 6;

/**
 * Grey blocks in the shape of the ticket page while it loads (wireframe 04 G): the title, the
 * description, and the details. Screen readers hear "Loading the ticket" instead.
 */
export function TicketPageSkeleton(): ReactElement {
  return (
    <div role="status">
      <span className="sr-only">Loading the ticket</span>
      <div aria-hidden="true" className="grid gap-6 motion-safe:animate-pulse">
        <div className="h-8 w-32 rounded-md bg-muted" />
        <div className="grid gap-2">
          <div className="h-4 w-24 rounded-md bg-muted" />
          <div className="h-8 w-3/4 rounded-md bg-muted" />
        </div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
          <div className="grid gap-3 md:col-start-2 md:row-start-1">
            {Array.from({ length: DETAIL_PLACEHOLDER_COUNT }, (_, index) => (
              <div key={index} className="h-5 rounded-md bg-muted" />
            ))}
          </div>
          <div className="h-40 rounded-lg bg-muted md:col-start-1 md:row-start-1" />
        </div>
      </div>
    </div>
  );
}

/**
 * Shown for a ticket key that isn't in this project: an unknown number, a deleted ticket, a
 * malformed key, or another project's key such as APP-3 under /projects/WEB (TKT-2, wireframe
 * 04 G). The user is a member here, so the way back goes to the project's board.
 */
export function TicketNotFound({ boardPath }: { boardPath: string }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <DocumentTitle title="Ticket not found" />
      <h1 className="text-2xl font-semibold">Ticket not found</h1>
      <p className="max-w-sm text-muted-foreground">
        It may have been deleted, or you don&apos;t have access to it.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link to={boardPath}>
          <ArrowLeftIcon aria-hidden="true" />
          Back to board
        </Link>
      </Button>
    </div>
  );
}
