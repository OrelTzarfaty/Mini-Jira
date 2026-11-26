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

export function encodeBoardCursor({ rank, id }: BoardCursor): string {
  return Buffer.from(JSON.stringify([rank, id]), 'utf8').toString('base64url');
}
