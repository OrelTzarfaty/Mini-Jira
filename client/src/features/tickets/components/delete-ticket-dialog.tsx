import type { ProjectDetail, Ticket } from '@mini-jira/shared';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/use-me';
import { useDeleteTicketMutation } from '@/features/tickets/hooks/use-delete-ticket-mutation';
import { canDeleteTicket } from '@/features/tickets/lib/can-delete-ticket';
import { deletedTicketState } from '@/features/tickets/lib/deleted-ticket';
import { serverErrorMessage } from '@/lib/show-server-error';

interface DeleteTicketDialogProps {
  ticket: Ticket;
  project: ProjectDetail;
}

/**
 * Delete on the ticket page (TKT-4, wireframe 04 A and D): shown only to the ticket's reporter
 * and the project owner, and asks "Delete WEB-12?" first. After deleting, the board says
 * "WEB-12 deleted". A failure (403, no connection) stays in the dialog so the user can retry.
 */
export function DeleteTicketDialog({
  ticket,
  project,
}: DeleteTicketDialogProps): ReactElement | null {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const deleteTicketMutation = useDeleteTicketMutation(project.key, ticket.key, {
    // Replace, so Back doesn't return to the page of a ticket that is gone.
    onDeleted: () => {
      void navigate(`/projects/${project.key}/board`, {
        replace: true,
        state: deletedTicketState(ticket.key),
      });
    },
  });

  if (!canDeleteTicket(ticket, project, user)) {
    return null;
  }

  function askToDelete(): void {
    // A new dialog starts without the error of the last one.
    deleteTicketMutation.reset();
    setIsDialogOpen(true);
  }

  return (
    <>
      <Button variant="outline" className="size-8 px-0 sm:w-auto sm:px-2.5" onClick={askToDelete}>
        <Trash2Icon aria-hidden="true" />
        {/* A phone shows only the icon, like Copy link; the word stays as the button's name. */}
        <span className="sr-only sm:not-sr-only">Delete</span>
      </Button>
      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`Delete ${ticket.key}?`}
        description="This also deletes its comments and history. This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        isPending={deleteTicketMutation.isPending}
        error={
          deleteTicketMutation.error ? serverErrorMessage(deleteTicketMutation.error) : undefined
        }
        onConfirm={() => {
          deleteTicketMutation.mutate();
        }}
      />
    </>
  );
}
