import { describe, expect, it } from 'vitest';

import { Status } from '../enums.js';
import {
  BOARD_CURSOR_MAX_LENGTH,
  BOARD_STATUSES,
  boardColumnParamsSchema,
  boardColumnQuerySchema,
  boardQuerySchema,
} from './board.js';

describe('board schemas (BRD-1)', () => {
  it('lists every status once, in workflow order', () => {
    expect(BOARD_STATUSES).toEqual(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
    expect([...BOARD_STATUSES].sort()).toEqual(Object.values(Status).sort());
  });

  it('accepts each status as the column parameter, and nothing else', () => {
    for (const status of BOARD_STATUSES) {
      expect(boardColumnParamsSchema.parse({ projectKey: 'WEB', status })).toEqual({ status });
    }
    expect(boardColumnParamsSchema.safeParse({ status: 'todo' }).success).toBe(false);
    expect(boardColumnParamsSchema.safeParse({ status: 'BLOCKED' }).success).toBe(false);
  });

  it('takes an optional cursor and rejects unknown query parameters', () => {
    expect(boardColumnQuerySchema.parse({})).toEqual({});
    expect(boardColumnQuerySchema.parse({ cursor: 'abc' })).toEqual({ cursor: 'abc' });
    expect(boardColumnQuerySchema.safeParse({ cursor: '' }).success).toBe(false);
    expect(
      boardColumnQuerySchema.safeParse({ cursor: 'a'.repeat(BOARD_CURSOR_MAX_LENGTH + 1) }).success,
    ).toBe(false);
    expect(boardColumnQuerySchema.safeParse({ cursor: ['a', 'b'] }).success).toBe(false);
    expect(boardColumnQuerySchema.safeParse({ page: '2' }).success).toBe(false);
    expect(boardQuerySchema.safeParse({ assignee: 'me' }).success).toBe(false);
  });
});
