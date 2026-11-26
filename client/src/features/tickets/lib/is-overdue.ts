import { Status } from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';

import { todayCalendarDate } from '@/lib/format-date';

/**
 * Whether the ticket is past its due date and not Done (wireframe 04: the due date turns red).
 * "YYYY-MM-DD" strings sort like the days they name, so a string comparison is enough.
 */
export function isOverdue(
  { dueDate, status }: Pick<Ticket, 'dueDate' | 'status'>,
  today: string = todayCalendarDate(),
): boolean {
  return dueDate !== null && dueDate < today && status !== Status.DONE;
}
