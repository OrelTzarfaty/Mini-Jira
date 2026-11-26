import { Priority, Status, TicketType } from '@mini-jira/shared';

/** The words the screens show for each ticket type (wireframe 03 B), in the order of the menus. */
export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.TASK]: 'Task',
  [TicketType.BUG]: 'Bug',
  [TicketType.STORY]: 'Story',
};

/** The words the screens show for each priority (wireframe 03 B), from lowest to highest. */
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
  [Priority.CRITICAL]: 'Critical',
};

/**
 * The words the screens show for each status (wireframes 03 and 04), in board column order: the
 * board's column headers (BRD-1) and the ticket page (TKT-2).
 */
export const STATUS_LABELS: Record<Status, string> = {
  [Status.TODO]: 'To Do',
  [Status.IN_PROGRESS]: 'In Progress',
  [Status.IN_REVIEW]: 'In Review',
  [Status.DONE]: 'Done',
};
