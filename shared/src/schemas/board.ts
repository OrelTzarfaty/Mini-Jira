import { z } from 'zod';

import { Status } from '../enums.js';
import { ticketSchema } from './tickets.js';

// BRD-1 (architecture §11): a column shows up to 50 cards; "load more" fetches the next 50.
export const BOARD_COLUMN_LIMIT = 50;

// BRD-1: the board's columns, left to right, in workflow order. The board always returns all
// four, also when a column is empty.
export const BOARD_STATUSES = [
  Status.TODO,
  Status.IN_PROGRESS,
  Status.IN_REVIEW,
  Status.DONE,
] as const satisfies readonly Status[];

// BRD-1: one card on the board: what the card shows and what the client needs to open or move
// it. Picked from the ticket, so the fields mean the same everywhere; no description, and never
// the rank (an internal sort value).
export const boardCardSchema = ticketSchema.pick({
  id: true,
  key: true,
  number: true,
  title: true,
  type: true,
  priority: true,
  status: true,
  dueDate: true,
  assignee: true,
  updatedAt: true,
});

export type BoardCard = z.infer<typeof boardCardSchema>;

// BRD-1: one column: `total` is every ticket in the column (the header count), `items` the cards
// of this page in rank order, and `nextCursor` what to send for the next page (null: no more).
export const boardColumnSchema = z.object({
  status: z.enum(Status),
  total: z.number().int().min(0),
  items: z.array(boardCardSchema),
  nextCursor: z.string().nullable(),
});

export type BoardColumn = z.infer<typeof boardColumnSchema>;

// BRD-1: `GET /api/projects/:projectKey/board`: the four columns in workflow order.
export const boardSchema = z.object({
  columns: z.array(boardColumnSchema),
});

export type Board = z.infer<typeof boardSchema>;

// BRD-1: the query of `GET /api/projects/:projectKey/board`. No parameters yet (the filters come
// with BRD-4); strict, so an unknown parameter is a 400 instead of being silently ignored.
export const boardQuerySchema = z.strictObject({});
