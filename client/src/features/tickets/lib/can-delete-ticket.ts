import { Role } from '@mini-jira/shared';
import type { ProjectDetail, PublicUser, Ticket } from '@mini-jira/shared';

/**
 * Whether the user may delete the ticket (TKT-4): its reporter or the project owner. Only hides
 * the button; the API checks the same rule and answers 403 to anyone else.
 */
export function canDeleteTicket(
  ticket: Pick<Ticket, 'reporter'>,
  project: Pick<ProjectDetail, 'role'>,
  user: Pick<PublicUser, 'id'>,
): boolean {
  return ticket.reporter.id === user.id || project.role === Role.OWNER;
}
