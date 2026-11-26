import { generateKeyBetween } from 'fractional-indexing';

/**
 * TKT-1, BRD-3 (architecture §10.2): the rank of a card that goes between two neighbours in a
 * status column. `before` is the rank of the card above (null: the new card goes first), `after`
 * the rank of the card below (null: it goes last). Only the moved card gets a new rank, so a move
 * never rewrites the rest of the column.
 *
 * Ranks are strings from the `fractional-indexing` package ("a0", "a1", "a0V", ...). They sort
 * byte by byte, which is why the Ticket.rank column uses COLLATE "C". There is always room
 * between two ranks: the new one just gets longer. Throws if both ranks are the same or one is
 * not a valid key (a bug: ranks only ever come from this function).
 */
export function rankBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}
