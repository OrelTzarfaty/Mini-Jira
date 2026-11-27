import { describe, expect, it } from 'vitest';

import { decodeBoardCursor, encodeBoardCursor } from '../../src/lib/board-cursor.js';

const ID = '0b6f1c1e-6f2a-4c4b-9d55-3a2f8e1d7c10';
const encodeJson = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

describe('board cursor (BRD-1)', () => {
  it.each(['a0', 'a0V', 'Zz', 'b00001'])('round-trips the rank %s and the id', (rank) => {
    const cursor = encodeBoardCursor({ rank, id: ID });

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeBoardCursor(cursor)).toEqual({ rank, id: ID });
  });

  it.each([
    ['not base64 JSON', 'abc'],
    ['empty', ''],
    ['an object, not a pair', encodeJson({ rank: 'a0', id: ID })],
    ['a pair with a number', encodeJson([1, ID])],
    ['three values', encodeJson(['a0', ID, 'x'])],
    ['a rank with other characters', encodeJson(['a0 ', ID])],
    ['a rank with a NUL character', encodeJson(['a\u00000', ID])],
    ['an empty rank', encodeJson(['', ID])],
    ['an id that is not a UUID', encodeJson(['a0', 'not-a-uuid'])],
    ['an uppercase id', encodeJson(['a0', ID.toUpperCase()])],
  ])('rejects %s', (_label, cursor) => {
    expect(decodeBoardCursor(cursor)).toBeNull();
  });

  it('rejects a cursor with characters the encoder never writes', () => {
    const cursor = encodeBoardCursor({ rank: 'a0', id: ID });

    // Node's decoder would skip the "!" and decode the rest; only the exact cursor counts.
    expect(decodeBoardCursor(`${cursor}!`)).toBeNull();
    expect(decodeBoardCursor(`${cursor}=`)).toBeNull();
  });
});
