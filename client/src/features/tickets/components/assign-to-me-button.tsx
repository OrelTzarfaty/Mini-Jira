import { EDIT_CONFLICT_MESSAGE, ErrorCode } from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import type { ReactElement } from 'react';

import { ApiError } from '@/api/api-error';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/use-me';
import { useUpdateTicketMutation } from '@/features/tickets/hooks/use-update-ticket-mutation';
import { serverErrorMessage } from '@/lib/show-server-error';

// The view-mode version of the TKT-3 conflict message: there is no form whose input to keep.
const ASSIGN_CONFLICT_ALERT = `${EDIT_CONFLICT_MESSAGE}. Reload it to see the changes, then try again.`;

interface AssignToMeButtonProps {
  projectKey: string;
  ticket: Ticket;
  /** After the server saved it: the page says so and moves the focus (this button is gone). */
  onAssigned: () => void;
  /** Loads the ticket again after a 409, so the next try sends its newer updatedAt. */
  onReload: () => void;
}

/**
 * "Assign to me" under "Assigned to" in view mode (wireframe 04 A, TKT-5): one click saves the
 * logged-in user as the assignee, without opening edit mode. It's a normal edit, so it sends the
 * ticket's updatedAt and a newer save by someone else is a 409 (CON-1). Only shown when the
 * logged-in user isn't the assignee already.
 */
export function AssignToMeButton({
  projectKey,
  ticket,
  onAssigned,
  onReload,
}: AssignToMeButtonProps): ReactElement | null {
  const me = useCurrentUser();
  const assignMutation = useUpdateTicketMutation(projectKey, ticket.key);

  if (ticket.assignee?.id === me.id) {
    return null;
  }

  const { error } = assignMutation;
  const isConflict = error instanceof ApiError && error.code === ErrorCode.EDIT_CONFLICT;

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="link"
        className="h-auto min-h-6 justify-self-start px-0"
        // Disabled while saving, so a double click sends one request.
        disabled={assignMutation.isPending}
        onClick={() => {
          assignMutation.mutate(
            { updatedAt: ticket.updatedAt, assigneeId: me.id },
            { onSuccess: onAssigned },
          );
        }}
      >
        {assignMutation.isPending ? 'Assigning…' : 'Assign to me'}
      </Button>
      {error && (
        <FormAlert message={isConflict ? ASSIGN_CONFLICT_ALERT : serverErrorMessage(error)} />
      )}
      {isConflict && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            assignMutation.reset();
            onReload();
          }}
        >
          Reload ticket
        </Button>
      )}
    </div>
  );
}
