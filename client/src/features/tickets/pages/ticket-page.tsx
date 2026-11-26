import { ArrowLeftIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { isNotFoundError } from '@/api/api-error';
import { DocumentTitle } from '@/components/document-title';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { useCurrentProject } from '@/features/projects/hooks/use-project';
import { CopyLinkButton } from '@/features/tickets/components/copy-link-button';
import { TicketDetails } from '@/features/tickets/components/ticket-details';
import {
  TicketNotFound,
  TicketPageSkeleton,
} from '@/features/tickets/components/ticket-page-states';
import { useTicket } from '@/features/tickets/hooks/use-ticket';
import { TICKET_TYPE_LABELS } from '@/features/tickets/lib/ticket-labels';
import { useRouteParam } from '@/lib/use-route-param';

/**
 * The ticket page, /projects/WEB/tickets/WEB-12 (TKT-2, wireframe 04 A and H): the title, the
 * description, and the details panel. Its own URL, so a link to it works after a reload or when
 * shared. Read-only for now: Edit, Delete, and the status dropdown come with TKT-3, TKT-4, and
 * BRD-2; comments and activity with CMT-1 and ACT-1.
 */
export function TicketPage(): ReactElement {
  const project = useCurrentProject();
  const ticketKey = useRouteParam('ticketKey');
  const { data: ticket, error, isError, isFetching, refetch } = useTicket(project.key, ticketKey);
  const boardPath = `/projects/${project.key}/board`;

  // Checked first: a ticket deleted while open must not stay on screen.
  if (isNotFoundError(error)) {
    return <TicketNotFound boardPath={boardPath} />;
  }

  if (!ticket) {
    if (isError && !isFetching) {
      return (
        <div className="grid gap-4">
          <DocumentTitle title="Something went wrong" />
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <ErrorState
            message="Couldn't load this ticket."
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      );
    }

    return <TicketPageSkeleton />;
  }

  // A failed background refresh keeps showing the ticket the user already has.
  return (
    <article className="grid gap-6">
      <DocumentTitle title={`${ticket.key} ${ticket.title}`} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {/* -ml-2.5 lines the arrow up with the title below it. */}
          <Button asChild variant="ghost" className="-ml-2.5">
            <Link to={boardPath}>
              <ArrowLeftIcon aria-hidden="true" />
              {/* A phone shows "Board" (wireframe 04 H); screen readers always hear the full words. */}
              <span aria-hidden="true" className="sm:hidden">
                Board
              </span>
              <span className="sr-only sm:not-sr-only">Back to board</span>
            </Link>
          </Button>
          <p className="hidden truncate text-sm text-muted-foreground sm:block">
            {project.key} / {ticket.key}
          </p>
        </div>
        <CopyLinkButton path={`/projects/${project.key}/tickets/${ticket.key}`} />
      </div>

      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          {TICKET_TYPE_LABELS[ticket.type]} · {ticket.key}
        </p>
        <h1 className="text-2xl font-semibold text-balance break-words">{ticket.title}</h1>
      </header>

      {/* The details come first in the page, as on a phone (wireframe 04 H); from 768px up they
          move to the right of the description (wireframe 04 A). */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
        <aside
          aria-label="Details"
          className="border-y py-4 md:col-start-2 md:row-start-1 md:rounded-lg md:border md:p-4"
        >
          <TicketDetails ticket={ticket} />
        </aside>
        <section
          aria-labelledby="ticket-description"
          className="grid gap-2 md:col-start-1 md:row-start-1"
        >
          <h2 id="ticket-description" className="text-lg font-semibold">
            Description
          </h2>
          {ticket.description ? (
            // pre-wrap keeps the line breaks the reporter typed (wireframe 04 A).
            <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
          ) : (
            <p className="text-muted-foreground">No description.</p>
          )}
        </section>
      </div>
    </article>
  );
}
