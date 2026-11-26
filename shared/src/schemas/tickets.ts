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
// TKT-2: the one 404 message for a ticket that isn't in the project: an unknown number, a key
// with another project's prefix, or a malformed key.
export const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';
// TKT-4: a member who is neither the ticket's reporter nor the project owner tried to delete it (403).
export const TICKET_DELETE_FORBIDDEN_MESSAGE =
  'Only the reporter or the project owner can delete this ticket';
export const DUE_DATE_FORMAT_MESSAGE = 'Due date must be a real date in the format YYYY-MM-DD';
// TKT-5: the assignee is a user id (a UUID); anything else is a 400 before it reaches the database
// (a uuid column would reject it with a 500).
export const INVALID_ASSIGNEE_ID_MESSAGE = 'Assignee must be a valid user id (UUID)';
// TKT-5: one message for a user who isn't in this project and an id no user has, so the answer
// never says whether the user exists elsewhere.
export const ASSIGNEE_NOT_MEMBER_MESSAGE = 'Assignee must be a project member';

// The years PostgreSQL's DATE column and a JavaScript Date agree on. Year 0000 is a valid
// ISO 8601 year but not a PostgreSQL date, so the insert would fail with a 500.
const DUE_DATE_MIN_YEAR = 1;

// TKT-1: an optional calendar day ("2026-12-01"), without a time or time zone, so every user sees
// the same day. z.iso.date() only accepts days that exist (no 2026-02-30); `abort` skips the year
// check after a format error, so the field gets one message.
const dueDateField = z.iso
  .date({ error: DUE_DATE_FORMAT_MESSAGE, abort: true })
  .refine((date) => Number(date.slice(0, 4)) >= DUE_DATE_MIN_YEAR, DUE_DATE_FORMAT_MESSAGE);

// TKT-1 and TKT-3: the field rules, shared by create and edit.
const ticketTitleSchema = requiredString('Title')
  .trim()
  .min(1, 'Title is required')
  .max(TICKET_TITLE_MAX_LENGTH, `Title must be at most ${TICKET_TITLE_MAX_LENGTH} characters`)
  .refine(
    (title) => !CONTROL_CHARACTER.test(title),
    "Title contains characters that aren't allowed",
  );

// Null is accepted too: null or empty after trimming both mean "no description", stored as null.
const ticketDescriptionSchema = z
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
  .nullable()
  .transform(blankToNull);

const ticketTypeSchema = z.enum(TicketType, 'Type must be TASK, BUG or STORY');
const ticketPrioritySchema = z.enum(Priority, 'Priority must be LOW, MEDIUM, HIGH or CRITICAL');
const ticketStatusSchema = z.enum(Status, 'Status must be TODO, IN_PROGRESS, IN_REVIEW or DONE');
// TKT-5: a user id, or null for "nobody". That the user is a member of the project is a service
// rule (it needs the database), checked in the same transaction as the write.
const ticketAssigneeIdSchema = z.uuid(INVALID_ASSIGNEE_ID_MESSAGE).nullable();

// TKT-1: the create-ticket form and `POST /api/projects/:projectKey/tickets` body. Strict, so
// fields the server decides (status, number, rank, reporter) can't be sent: a new ticket always
// starts in To Do, at the bottom of the column, reported by the caller. TKT-5: an optional
// assignee, who must be a project member.
export const createTicketSchema = z.strictObject({
  title: ticketTitleSchema,
  // Optional: missing, null, or empty after trimming are all stored as null.
  description: ticketDescriptionSchema.optional().transform(blankToNull),
  type: ticketTypeSchema.default(TicketType.TASK),
  priority: ticketPrioritySchema.default(Priority.MEDIUM),
  // Optional: missing or null means no due date.
  dueDate: dueDateField.nullish().transform((date) => date ?? null),
  // TKT-5: optional; missing or null means unassigned. A missing one stays missing (no default),
  // so the create form's request body doesn't gain a field it never shows.
  assigneeId: ticketAssigneeIdSchema.optional(),
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

// TKT-3, CON-1: the 409 EDIT_CONFLICT message when someone else saved the ticket after the
// client loaded it (architecture §10.3).
export const EDIT_CONFLICT_MESSAGE = 'This ticket was updated by someone else';
// TKT-3: shown when an edit sends only `updatedAt` and no field to change.
export const TICKET_UPDATE_EMPTY_MESSAGE = 'Change at least one field';
export const TICKET_UPDATED_AT_MESSAGE =
  'updatedAt must be the updatedAt of the ticket as it was loaded (an ISO date-time)';

// TKT-3: the edit-ticket form and `PATCH /api/projects/:projectKey/tickets/:ticketKey` body.
// `updatedAt` is required: the ticket's updatedAt exactly as the client loaded it, so the server
// can tell that someone else saved the ticket in the meantime (409 EDIT_CONFLICT, architecture
// §10.3). Every other field is optional: a missing field stays as it is, and at least one must
// be sent. The text rules are the same as at create; a null or blank description and a null due
// date clear them, and a null assigneeId unassigns the ticket (TKT-5). Strict, so fields the
// server decides (number, rank, reporter, ...) and fields that aren't editable yet (estimate:
// waits for DOC-5) are a 400.
export const updateTicketSchema = z
  .strictObject({
    updatedAt: z.iso.datetime({
      error: (issue) =>
        issue.input === undefined ? 'updatedAt is required' : TICKET_UPDATED_AT_MESSAGE,
    }),
    title: ticketTitleSchema.optional(),
    description: ticketDescriptionSchema.optional(),
    type: ticketTypeSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    status: ticketStatusSchema.optional(),
    dueDate: dueDateField.nullable().optional(),
    assigneeId: ticketAssigneeIdSchema.optional(),
  })
  .refine(
    (input) =>
      Object.entries(input).some(([field, value]) => field !== 'updatedAt' && value !== undefined),
    { error: TICKET_UPDATE_EMPTY_MESSAGE },
  );

/** What the client sends to edit a ticket (before trimming). */
export type UpdateTicketFormValues = z.input<typeof updateTicketSchema>;
/** What the server works with: a missing field is undefined (unchanged), a cleared one null. */
export type UpdateTicketInput = z.output<typeof updateTicketSchema>;
