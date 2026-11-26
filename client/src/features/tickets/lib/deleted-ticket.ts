import { z } from 'zod';

/**
 * What the ticket page hands to the board after deleting a ticket (TKT-4), as the history entry's
 * state, so the board can say "WEB-12 deleted" (wireframe 04 D).
 */
const deletedTicketStateSchema = z.object({ deletedTicketKey: z.string() });

export type DeletedTicketState = z.infer<typeof deletedTicketStateSchema>;

export function deletedTicketState(ticketKey: string): DeletedTicketState {
  return { deletedTicketKey: ticketKey };
}

/**
 * The deleted ticket's key from a history entry's state, or undefined. The state can be anything
 * (another page's state, or none), so it is checked rather than trusted.
 */
export function deletedTicketKeyFrom(state: unknown): string | undefined {
  const parsed = deletedTicketStateSchema.safeParse(state);

  return parsed.success ? parsed.data.deletedTicketKey : undefined;
}
