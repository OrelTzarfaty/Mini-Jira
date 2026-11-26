import { Status } from '@mini-jira/shared';
import { describe, expect, it } from 'vitest';

import { isOverdue } from './is-overdue';

const TODAY = '2026-11-26';

describe('isOverdue', () => {
  it.each([
    ['due yesterday, To Do', '2026-11-25', Status.TODO, true],
    ['due yesterday, In Review', '2026-11-25', Status.IN_REVIEW, true],
    ['due yesterday, Done', '2026-11-25', Status.DONE, false],
    ['due today', TODAY, Status.TODO, false],
    ['due tomorrow', '2026-11-27', Status.TODO, false],
    ['no due date', null, Status.TODO, false],
  ] as const)('TKT-2: %s → overdue is %s', (_case, dueDate, status, expected) => {
    expect(isOverdue({ dueDate, status }, TODAY)).toBe(expected);
  });
});
