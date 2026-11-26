// Internal helpers shared by the schema modules. Not exported from the package index.
import { z } from 'zod';

// Unicode control characters (category Cc): C0 U+0000-U+001F, DEL U+007F and C1 U+0080-U+009F.
// A name is one line of display text, so none of them belong in it, and PostgreSQL can't
// store U+0000 in a text column at all (the insert would fail as a 500).
export const CONTROL_CHARACTER = /\p{Cc}/u;

/** A string field that says "<label> is required" when it is missing; other type errors keep zod's message. */
export const requiredString = (label: string): z.ZodString =>
  z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required` : undefined),
  });

// A description may span lines, so tab, line feed and carriage return are allowed; every other
// control character is rejected (PostgreSQL can't store U+0000 in a text column).
export const DESCRIPTION_CONTROL_CHARACTER = /(?![\t\n\r])\p{Cc}/u;

/** Missing, null, or empty (after trimming) optional text is stored as null: one "no value". */
export const blankToNull = (text: string | null | undefined): string | null =>
  text === undefined || text === null || text === '' ? null : text;
