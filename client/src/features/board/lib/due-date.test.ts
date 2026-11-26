import { Status } from '@mini-jira/shared';
import { describe, expect, it } from 'vitest';

import { formatDueDate, isOverdue } from './due-date';

// Noon local time, so the tests mean the same day in every time zone.
const NOW = new Date(2026, 10, 26, 12);

describe('formatDueDate', () => {
  it('BRD-1: shows a date of this year as month and day', () => {
    expect(formatDueDate('2026-11-30', NOW)).toBe('Nov 30');
  });

  it('BRD-1: adds the year to a date in another year', () => {
    expect(formatDueDate('2027-01-05', NOW)).toBe('Jan 5, 2027');
  });
});

describe('isOverdue', () => {
  it('BRD-1: a past due date on an open ticket is overdue', () => {
    expect(isOverdue('2026-11-25', Status.IN_PROGRESS, NOW)).toBe(true);
  });

  it('BRD-1: the due day itself and later days are not overdue', () => {
    expect(isOverdue('2026-11-26', Status.TODO, NOW)).toBe(false);
    expect(isOverdue('2026-12-01', Status.TODO, NOW)).toBe(false);
  });

  it('BRD-1: a Done ticket and a ticket without a due date are never overdue', () => {
    expect(isOverdue('2026-11-01', Status.DONE, NOW)).toBe(false);
    expect(isOverdue(null, Status.TODO, NOW)).toBe(false);
  });
});
