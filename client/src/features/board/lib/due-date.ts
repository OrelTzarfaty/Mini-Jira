import { Status } from '@mini-jira/shared';

/** A date-only value from the API ("2026-11-30") as a moment at UTC midnight of that day. */
function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Today in the user's own time zone, as the API writes dates ("2026-11-30"). */
function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(date.getFullYear())}-${month}-${day}`;
}

/**
 * A due date as the card shows it (wireframe 03 B): "Nov 30", with the year only when it isn't
 * this year ("Jan 5, 2027"), so a date in another year is never mistaken for this one.
 */
export function formatDueDate(isoDate: string, now: Date = new Date()): string {
  const date = parseIsoDate(isoDate);
  const isThisYear = date.getUTCFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: isThisYear ? undefined : 'numeric',
    // The date has no time: reading it in UTC keeps it the same day in every time zone.
    timeZone: 'UTC',
  }).format(date);
}

/**
 * A ticket is overdue when its due date has passed and it isn't Done (wireframe 03 B). The due
 * day itself still counts as on time; "today" is the user's own calendar day.
 */
export function isOverdue(dueDate: string | null, status: Status, now: Date = new Date()): boolean {
  return dueDate !== null && status !== Status.DONE && dueDate < toLocalIsoDate(now);
}
