import type { Ticket, UpdateTicketInput } from '@mini-jira/shared';

/** The fields the edit form changes (TKT-3). The assignee comes with TKT-5. */
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

  return Object.keys(changes).length > 1 ? changes : null;
}
