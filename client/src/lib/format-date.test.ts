import { describe, expect, it } from 'vitest';

import { formatCalendarDate, todayCalendarDate } from './format-date';

describe('formatCalendarDate', () => {
  it.each([
    ['2026-11-30', 'Nov 30, 2026'],
    ['2026-01-01', 'Jan 1, 2026'],
    ['2026-12-31', 'Dec 31, 2026'],
  ])('TKT-2: shows %s as %s, whatever the time zone', (date, expected) => {
    expect(formatCalendarDate(date)).toBe(expected);
  });
});

describe('todayCalendarDate', () => {
  it('TKT-2: gives the local day as YYYY-MM-DD with leading zeros', () => {
    expect(todayCalendarDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
