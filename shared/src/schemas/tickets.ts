import { z } from 'zod';

import { Priority, Status, TicketType } from '../enums.js';
import {
  blankToNull,
  CONTROL_CHARACTER,
  DESCRIPTION_CONTROL_CHARACTER,
  requiredString,
} from './common.js';

export const TICKET_TITLE_MAX_LENGTH = 120;
// TKT-1: room for a detailed bug report (steps, expected and actual result, a pasted log
// excerpt) while staying far below the 100 kB request body limit, even when every character
// takes 4 bytes in UTF-8.
export const TICKET_DESCRIPTION_MAX_LENGTH = 10_000;
export const DUE_DATE_FORMAT_MESSAGE = 'Due date must be a real date in the format YYYY-MM-DD';

// The years PostgreSQL's DATE column and a JavaScript Date agree on. Year 0000 is a valid
// ISO 8601 year but not a PostgreSQL date, so the insert would fail with a 500.
const DUE_DATE_MIN_YEAR = 1;

// TKT-1: an optional calendar day ("2026-12-01"), without a time or time zone, so every user sees
// the same day. z.iso.date() only accepts days that exist (no 2026-02-30); `abort` skips the year
// check after a format error, so the field gets one message.
const dueDateField = z.iso
  .date({ error: DUE_DATE_FORMAT_MESSAGE, abort: true })
  .refine((date) => Number(date.slice(0, 4)) >= DUE_DATE_MIN_YEAR, DUE_DATE_FORMAT_MESSAGE);

// TKT-1: the create-ticket form and `POST /api/projects/:projectKey/tickets` body. Strict, so
// fields the server decides (status, number, rank, reporter, assignee) can't be sent: a new ticket
// always starts in To Do, at the bottom of the column, reported by the caller. The assignee comes
// with TKT-5.
export const createTicketSchema = z.strictObject({
  title: requiredString('Title')
    .trim()
    .min(1, 'Title is required')
    .max(TICKET_TITLE_MAX_LENGTH, `Title must be at most ${TICKET_TITLE_MAX_LENGTH} characters`)
    .refine(
      (title) => !CONTROL_CHARACTER.test(title),
      "Title contains characters that aren't allowed",
    ),
  // Optional: missing, null, or empty after trimming are all stored as null.
  description: z
    .string()
    .trim()
    .max(
      TICKET_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${TICKET_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .refine(
      (description) => !DESCRIPTION_CONTROL_CHARACTER.test(description),
      "Description contains characters that aren't allowed",
    )
    .nullish()
    .transform(blankToNull),
  type: z.enum(TicketType, 'Type must be TASK, BUG or STORY').default(TicketType.TASK),
  priority: z
    .enum(Priority, 'Priority must be LOW, MEDIUM, HIGH or CRITICAL')
    .default(Priority.MEDIUM),
  // Optional: missing or null means no due date.
  dueDate: dueDateField.nullish().transform((date) => date ?? null),
});

/** What the client sends (before trimming and defaults). */
export type CreateTicketFormValues = z.input<typeof createTicketSchema>;
/** What the server works with after parsing (defaults applied, blanks are null). */
export type CreateTicketInput = z.output<typeof createTicketSchema>;

// TKT-1: a user shown on a ticket (reporter, assignee): only the public id and name.
export const ticketUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export type TicketUser = z.infer<typeof ticketUserSchema>;

// TKT-1: what the API returns for a ticket. A plain (stripping) object, so internal fields (the
// rank, the project and user ids) never leave the API. `key` is the project key and the number
// (WEB-12); `updatedAt` is also the version the edit form sends back (CON-1).
export const ticketSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  number: z.number().int().min(1),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(TicketType),
  priority: z.enum(Priority),
  status: z.enum(Status),
  reporter: ticketUserSchema,
  assignee: ticketUserSchema.nullable(),
  dueDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Ticket = z.infer<typeof ticketSchema>;
