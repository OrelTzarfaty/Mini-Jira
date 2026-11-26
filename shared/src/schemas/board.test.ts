import { describe, expect, it } from 'vitest';

import { Status } from '../enums.js';
import { BOARD_STATUSES, boardQuerySchema } from './board.js';

describe('board schemas (BRD-1)', () => {
  it('lists every status once, in workflow order', () => {
    expect(BOARD_STATUSES).toEqual(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
    expect([...BOARD_STATUSES].sort()).toEqual(Object.values(Status).sort());
  });

  it('rejects unknown query parameters (the filters come with BRD-4)', () => {
    expect(boardQuerySchema.parse({})).toEqual({});
    expect(boardQuerySchema.safeParse({ assignee: 'me' }).success).toBe(false);
  });
});
