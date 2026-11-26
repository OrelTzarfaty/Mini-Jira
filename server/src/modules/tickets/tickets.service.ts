import { PROJECT_NOT_FOUND_MESSAGE, Status, ticketSchema } from '@mini-jira/shared';
import type { CreateTicketInput, Ticket } from '@mini-jira/shared';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { NotFoundError } from '../../lib/errors.js';
import { isRecordNotFound } from '../../lib/prisma-errors.js';
import { rankBetween } from '../../lib/rank.js';
import { formatTicketKey } from '../../lib/ticket-key.js';

/** The project a ticket belongs to: its id for the queries and its key for the ticket key. */
export interface TicketProject {
  id: string;
  key: string;
}

export interface TicketsService {
  /**
   * TKT-1: creates a ticket in To Do, at the bottom of the column, with the project's next
   * number (never reused). Throws 404 when the project was deleted in the meantime.
   */
  createTicket(
    project: TicketProject,
    reporterId: string,
    input: CreateTicketInput,
  ): Promise<Ticket>;
}

// Only the fields the API returns; users show only their public id and name.
const USER_FIELDS = { select: { id: true, name: true } } as const;
const TICKET_FIELDS = {
  id: true,
  number: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  reporter: USER_FIELDS,
  assignee: USER_FIELDS,
} as const;

interface TicketRow {
  id: string;
  number: number;
  title: string;
  description: string | null;
  type: Ticket['type'];
  priority: Ticket['priority'];
  status: Ticket['status'];
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reporter: Ticket['reporter'];
  assignee: Ticket['assignee'];
}

/** A DATE column comes back as midnight UTC of that day; the API sends only the day. */
export function toCalendarDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The API shape of a ticket row, parsed through the shared schema (a DTO, standards §6.3). */
function toTicketResponse(projectKey: string, ticket: TicketRow): Ticket {
  return ticketSchema.parse({
    ...ticket,
    key: formatTicketKey(projectKey, ticket.number),
    dueDate: ticket.dueDate === null ? null : toCalendarDay(ticket.dueDate),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  });
}

export function createTicketsService(prisma: PrismaClient): TicketsService {
  return {
    // TKT-1 (architecture §10.1, §10.2): one transaction, three steps, in this order.
    // 1. The atomic increment takes a row lock on the project, so a second create in the same
    //    project waits here until the first one commits, and then gets the next number. Numbers
    //    are unique and never reused (the counter only goes up; the (projectId, number) unique
    //    index is the safety net).
    // 2. The rank is read after the lock: in READ COMMITTED each statement sees every row
    //    committed before it started, so the waiting create sees the ticket the first one added
    //    and goes below it. The (projectId, status, rank) index finds the last To Do card.
    // 3. The insert, with picked fields only: the request body never reaches Prisma as it is.
    // If any step fails, all three roll back, so no number is spent on a ticket that wasn't saved.
    async createTicket(project, reporterId, { title, description, type, priority, dueDate }) {
      try {
        const ticket = await prisma.$transaction(async (tx) => {
          const { ticketCounter } = await tx.project.update({
            where: { id: project.id },
            data: { ticketCounter: { increment: 1 } },
            select: { ticketCounter: true },
          });
          const lastInTodo = await tx.ticket.findFirst({
            where: { projectId: project.id, status: Status.TODO },
            orderBy: { rank: 'desc' },
            select: { rank: true },
          });

          return tx.ticket.create({
            data: {
              projectId: project.id,
              number: ticketCounter,
              title,
              description,
              type,
              priority,
              status: Status.TODO,
              rank: rankBetween(lastInTodo?.rank ?? null, null),
              reporterId,
              // "2026-12-01" is parsed as midnight UTC, which the DATE column stores as that day.
              dueDate: dueDate === null ? null : new Date(dueDate),
            },
            select: TICKET_FIELDS,
          });
        });

        return toTicketResponse(project.key, ticket);
      } catch (error) {
        // The project was deleted after loadProjectAccess checked it: the same 404 as for a
        // missing project.
        if (isRecordNotFound(error)) {
          throw new NotFoundError(PROJECT_NOT_FOUND_MESSAGE);
        }
        throw error;
      }
    },
  };
}
