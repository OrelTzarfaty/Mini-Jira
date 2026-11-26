import type { Ticket, UpdateTicketInput } from '@mini-jira/shared';

/** The edit form's fields (TKT-3) that the ticket holds under the same name. */
const EDITABLE_FIELDS = [
  'title',
  'description',
  'type',
  'priority',
  'status',
  'dueDate',
] as const satisfies readonly (keyof UpdateTicketInput & keyof Ticket)[];

/**
 * The PATCH body for an edit (TKT-3): the `updatedAt` of the ticket as it was loaded, plus only
 * the fields that differ from it. Returns null when nothing changed, so no request is needed.
 * Sending only the changes keeps the activity history (ACT-1) to what the user really changed.
 */
export function ticketChanges(loaded: Ticket, edited: UpdateTicketInput): UpdateTicketInput | null {
  const changes: UpdateTicketInput = { updatedAt: loaded.updatedAt };

  for (const field of EDITABLE_FIELDS) {
    const value = edited[field];

    if (value !== undefined && value !== loaded[field]) {
      Object.assign(changes, { [field]: value });
    }
  }

  // TKT-5: the ticket holds the assignee as a user ({ id, name }), the form as their id.
  const loadedAssigneeId = loaded.assignee?.id ?? null;

  if (edited.assigneeId !== undefined && edited.assigneeId !== loadedAssigneeId) {
    changes.assigneeId = edited.assigneeId;
  }

  return Object.keys(changes).length > 1 ? changes : null;
}
