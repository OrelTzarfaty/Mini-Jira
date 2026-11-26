import { ArrowLeftIcon, PencilIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router';

import { isNotFoundError } from '@/api/api-error';
import type { Ticket } from '@mini-jira/shared';
import { DocumentTitle } from '@/components/document-title';
import { ErrorState } from '@/components/error-state';
import { ToastMessage } from '@/components/toast-message';
import { Button } from '@/components/ui/button';
import { useCurrentProject } from '@/features/projects/hooks/use-project';
import { AssignToMeButton } from '@/features/tickets/components/assign-to-me-button';
import { CopyLinkButton } from '@/features/tickets/components/copy-link-button';
import { DeleteTicketDialog } from '@/features/tickets/components/delete-ticket-dialog';
import { EditTicketForm } from '@/features/tickets/components/edit-ticket-form';
import { TicketDetails } from '@/features/tickets/components/ticket-details';
import {
  TicketNotFound,
  TicketPageSkeleton,
} from '@/features/tickets/components/ticket-page-states';
import { useTicket } from '@/features/tickets/hooks/use-ticket';
import { TICKET_TYPE_LABELS } from '@/features/tickets/lib/ticket-labels';
import { useAutoClearState } from '@/lib/use-auto-clear-state';
import { useRouteParam } from '@/lib/use-route-param';

// Long enough to read; the page shows the saved values anyway.
const SAVED_MESSAGE_DURATION_MS = 4000;

/**
 * The ticket page, /projects/WEB/tickets/WEB-12 (TKT-2, wireframe 04 A and H): the title, the
 * description, and the details panel. Its own URL, so a link to it works after a reload or when
 * shared. Edit switches the page to edit mode (TKT-3, wireframe 04 B); "Assign to me" in the
 * details panel saves the logged-in user as the assignee (TKT-5). Delete shows for the reporter
 * and the project owner (TKT-4). The status dropdown comes with BRD-2; comments and activity
 * with CMT-1 and ACT-1.
 */
export function TicketPage(): ReactElement {
  const project = useCurrentProject();
  const ticketKey = useRouteParam('ticketKey');
  const { data: ticket, error, isError, isFetching, refetch } = useTicket(project.key, ticketKey);
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [savedMessage, setSavedMessage] = useAutoClearState<string>(SAVED_MESSAGE_DURATION_MS);
  const boardPath = `/projects/${project.key}/board`;

  // Back to view mode, with focus back on Edit (the form that had it is gone). flushSync puts
  // the button on screen first, so there is something to focus.
  function closeEditMode(): void {
    flushSync(() => {
      setIsEditing(false);
    });
    editButtonRef.current?.focus();
  }

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
        <div className="flex items-center gap-2">
          <CopyLinkButton path={`/projects/${project.key}/tickets/${ticket.key}`} />
          {!isEditing && (
            <Button
              ref={editButtonRef}
              variant="outline"
              className="size-8 px-0 sm:w-auto sm:px-2.5"
              onClick={() => {
                setIsEditing(true);
              }}
            >
              <PencilIcon aria-hidden="true" />
              {/* A phone shows only the icon, like Copy link; the word stays as the button's name. */}
              <span className="sr-only sm:not-sr-only">Edit</span>
            </Button>
          )}
          {/* Only for the reporter or the owner (TKT-4). Hidden in edit mode, like Edit, so a
              delete never happens with unsaved changes on screen. */}
          {!isEditing && <DeleteTicketDialog ticket={ticket} project={project} />}
        </div>
      </div>

      {isEditing ? (
        <EditTicketForm
          projectKey={project.key}
          ticket={ticket}
          onCancel={closeEditMode}
          onSaved={() => {
            closeEditMode();
            setSavedMessage('Changes saved');
          }}
        />
      ) : (
        <TicketView
          ticket={ticket}
          assigneeAction={
            <AssignToMeButton
              projectKey={project.key}
              ticket={ticket}
              onAssigned={() => {
                // The button is gone now (the user is the assignee), so focus goes to Edit,
                // as after saving an edit.
                editButtonRef.current?.focus();
                setSavedMessage('Assigned to you');
              }}
              onReload={() => {
                void refetch();
              }}
            />
          }
        />
      )}
      <ToastMessage
        message={savedMessage}
        onDismiss={() => {
          setSavedMessage(null);
        }}
      />
    </article>
  );
}

/** The ticket in view mode: the title, the description, and the details panel (wireframe 04 A). */
function TicketView({
  ticket,
  assigneeAction,
}: {
  ticket: Ticket;
  assigneeAction: ReactNode;
}): ReactElement {
  return (
    <>
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
          <TicketDetails ticket={ticket} assigneeAction={assigneeAction} />
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
    </>
  );
}
