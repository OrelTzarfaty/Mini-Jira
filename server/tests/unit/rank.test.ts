import { describe, expect, it } from 'vitest';

import { rankBetween } from '../../src/lib/rank.js';

// Byte order, the order PostgreSQL uses for the Ticket.rank column (COLLATE "C").
const byteOrder = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

describe('rankBetween', () => {
  it('TKT-1: gives the first card of an empty column a rank', () => {
    expect(rankBetween(null, null)).toBe('a0');
  });

  it('TKT-1: a rank after the last card sorts after it', () => {
    const last = rankBetween(null, null);

    expect(byteOrder(rankBetween(last, null), last)).toBe(1);
  });

  it('BRD-3: a rank before the first card sorts before it', () => {
    const first = rankBetween(null, null);

    expect(byteOrder(rankBetween(null, first), first)).toBe(-1);
  });

  it('BRD-3: a rank between two cards sorts between them', () => {
    const above = rankBetween(null, null);
    const below = rankBetween(above, null);
    const middle = rankBetween(above, below);

    expect([below, middle, above].sort(byteOrder)).toEqual([above, middle, below]);
  });

  it('TKT-1: 200 cards added at the bottom keep their order and get different ranks', () => {
    const ranks: string[] = [];
    for (let index = 0; index < 200; index += 1) {
      ranks.push(rankBetween(ranks.at(-1) ?? null, null));
    }

    expect([...ranks].sort(byteOrder)).toEqual(ranks);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  it('BRD-3: 50 cards put into the same gap still fit, in order', () => {
    const top = rankBetween(null, null);
    let below = rankBetween(top, null);
    const column = [top, below];
    for (let index = 0; index < 50; index += 1) {
      below = rankBetween(top, below);
      column.splice(1, 0, below);
    }

    expect([...column].sort(byteOrder)).toEqual(column);
    expect(new Set(column).size).toBe(column.length);
  });

  it.each([
    ['both ranks are the same', 'a0', 'a0'],
    ['a rank is not a valid key', 'not a rank', null],
    ['a rank has a trailing zero', 'a00', null],
  ])('BRD-3: throws when %s', (_case, before, after) => {
    expect(() => rankBetween(before, after)).toThrow();
  });
});
