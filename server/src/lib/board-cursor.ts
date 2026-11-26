/**
 * BRD-1 (architecture §9): the "load more" cursor of a board column. A column is sorted by rank,
 * then by id, so the cursor holds both values of the last card the client has: the next page
 * starts right after that card (keyset pagination). Unlike page numbers, cards added or moved
 * higher up in the meantime don't shift the next page, so no card is skipped or shown twice.
 *
 * The id is the tie-breaker: ranks are unique today, but two concurrent moves into the same gap
 * (BRD-2, "last move wins") can give two cards the same rank.
 *
 * The cursor is opaque to the client: base64url of the JSON `[rank, id]`. Base64url keeps it safe
 * in a URL without escaping; the client only sends back what the API gave it.
 */
export interface BoardCursor {
  rank: string;
  id: string;
}

// Ranks come from fractional-indexing, whose keys use only the base-62 digits 0-9, A-Z, a-z.
const RANK_PATTERN = /^[0-9A-Za-z]+$/;
// Ticket ids are UUIDs (lowercase, as PostgreSQL returns them). Checking the shape before the
// query matters: a uuid column rejects anything else with an error, which would be a 500.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function encodeBoardCursor({ rank, id }: BoardCursor): string {
  return Buffer.from(JSON.stringify([rank, id]), 'utf8').toString('base64url');
}

/** The rank and id in a cursor; null for anything `encodeBoardCursor` didn't produce. */
export function decodeBoardCursor(cursor: string): BoardCursor | null {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const [rank, id] = value as unknown[];
  if (typeof rank !== 'string' || typeof id !== 'string') {
    return null;
  }
  if (!RANK_PATTERN.test(rank) || !UUID_PATTERN.test(id)) {
    return null;
  }

  const decoded = { rank, id };

  // Node's base64url decoder skips characters it doesn't know, so "abc!" and "abc" would decode
  // the same. Only the exact text we produce counts, so each position has one cursor.
  return encodeBoardCursor(decoded) === cursor ? decoded : null;
}
