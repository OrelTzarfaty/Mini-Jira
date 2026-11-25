import { PROJECT_KEY_MAX_LENGTH, PROJECT_KEY_MIN_LENGTH } from '@mini-jira/shared';

/**
 * TKT-1 (architecture §8): a ticket key such as `WEB-12` is the project key, a dash, and the
 * ticket's number in that project. It is never stored; it is built from both values when needed.
 */
export interface TicketKeyParts {
  projectKey: string;
  number: number;
}

// The largest value of a PostgreSQL INTEGER column (Ticket.number); a bigger number can't exist.
const MAX_TICKET_NUMBER = 2_147_483_647;

// A stored project key (uppercase A-Z), a dash, and a positive number without leading zeros, so
// each ticket has exactly one key ("WEB-012" and "web-12" are not keys).
const TICKET_KEY_PATTERN = new RegExp(
  `^([A-Z]{${PROJECT_KEY_MIN_LENGTH},${PROJECT_KEY_MAX_LENGTH}})-([1-9][0-9]*)$`,
);

/** `formatTicketKey('WEB', 12)` → `'WEB-12'`. */
export function formatTicketKey(projectKey: string, number: number): string {
  return `${projectKey}-${number}`;
}

/** `parseTicketKey('WEB-12')` → `{ projectKey: 'WEB', number: 12 }`; null for anything that isn't a key. */
export function parseTicketKey(ticketKey: string): TicketKeyParts | null {
  const match = TICKET_KEY_PATTERN.exec(ticketKey);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const number = Number(match[2]);

  return number <= MAX_TICKET_NUMBER ? { projectKey: match[1], number } : null;
}
