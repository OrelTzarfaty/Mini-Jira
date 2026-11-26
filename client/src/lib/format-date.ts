// The app's words are English, so dates are too ("Nov 30, 2026"), whatever the browser's language.
const LOCALE = 'en-US';

// A calendar day has no time zone, so it is formatted in UTC: "2026-11-30" is Nov 30 everywhere.
const calendarDateFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

// A moment (createdAt) is shown in the user's own time zone.
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** "2026-11-30" (a day without a time, such as a due date) → "Nov 30, 2026". */
export function formatCalendarDate(date: string): string {
  return calendarDateFormat.format(new Date(`${date}T00:00:00Z`));
}

/** An ISO date-time → "Nov 30, 2026, 9:05 AM" in the user's time zone. */
export function formatDateTime(isoDateTime: string): string {
  return dateTimeFormat.format(new Date(isoDateTime));
}

/** Today in the user's time zone as "YYYY-MM-DD", to compare with calendar days. */
export function todayCalendarDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${String(now.getFullYear())}-${month}-${day}`;
}
