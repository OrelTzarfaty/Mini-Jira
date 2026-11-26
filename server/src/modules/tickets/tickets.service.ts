import {
  ASSIGNEE_NOT_MEMBER_MESSAGE,
  EDIT_CONFLICT_MESSAGE,
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  Status,
  TICKET_NOT_FOUND_MESSAGE,
  ticketSchema,
} from '@mini-jira/shared';
import type { CreateTicketInput, Ticket, UpdateTicketInput } from '@mini-jira/shared';

import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { isRecordNotFound } from '../../lib/prisma-errors.js';
import { rankBetween } from '../../lib/rank.js';
import { formatTicketKey, parseTicketKey } from '../../lib/ticket-key.js';

/** The project a ticket belongs to: its id for the queries and its key for the ticket key. */
export interface TicketProject {
  id: string;
  key: string;
}

export interface TicketsService {
  /**
   * TKT-1: creates a ticket in To Do, at the bottom of the column, with the project's next
   * number (never reused). Throws 404 when the project was deleted in the meantime, and 400 on
   * `assigneeId` when the assignee isn't a member of the project (TKT-5).
   */
  createTicket(
    project: TicketProject,
    reporterId: string,
    input: CreateTicketInput,
  ): Promise<Ticket>;

  /**
   * TKT-2: the ticket with this key in this project. Throws 404 when the key is malformed, its
   * prefix is another project's key, or the project has no ticket with that number.
   */
  getTicket(project: TicketProject, ticketKey: string): Promise<Ticket>;

  /**
   * TKT-3: saves the sent fields if the ticket is still at the `updatedAt` the client loaded
   * (CON-1, architecture §10.3). Throws 404 like getTicket (also when the ticket is deleted while
   * saving), 409 EDIT_CONFLICT when someone else changed the ticket in the meantime, and 400 on
   * `assigneeId` when the new assignee isn't a member of the project (TKT-5).
   */
  updateTicket(
    project: TicketProject,
    ticketKey: string,
    input: UpdateTicketInput,
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

const ticketNotFound = (): NotFoundError => new NotFoundError(TICKET_NOT_FOUND_MESSAGE);

/** TKT-2: the ticket number from a key, or a 404 when the key isn't one of this project's. */
function ticketNumberIn(project: TicketProject, ticketKey: string): number {
  const parts = parseTicketKey(ticketKey);
  if (parts?.projectKey !== project.key) {
    throw ticketNotFound();
  }

  return parts.number;
}

/** "2026-12-01" is parsed as midnight UTC, which the DATE column stores as that day. */
const toDueDateColumn = (dueDate: string | null): Date | null =>
  dueDate === null ? null : new Date(dueDate);

/**
 * TKT-5: the assignee must be a member of this project. Call it inside the transaction that
 * writes the ticket. `FOR SHARE` locks the membership row until that transaction ends, so a
 * member removal at the same moment (PRJ-4, which deletes the row and then unassigns the user's
 * tickets) either waits and then also unassigns this ticket, or commits first, and then this
 * finds no row. Without the lock, a ticket could stay assigned to a removed member.
 * A user of another project and an id no user has get the same 400, so the answer never says
 * whether the user exists.
 */
async function assertAssigneeIsMember(
  tx: Prisma.TransactionClient,
  projectId: string,
  assigneeId: string,
): Promise<void> {
  const membership = await tx.$queryRaw<unknown[]>`
    SELECT 1 FROM "ProjectMember"
    WHERE "projectId" = ${projectId}::uuid AND "userId" = ${assigneeId}::uuid
    FOR SHARE`;
  if (membership.length === 0) {
    throw new ValidationError(ASSIGNEE_NOT_MEMBER_MESSAGE, [
      { field: 'assigneeId', message: ASSIGNEE_NOT_MEMBER_MESSAGE },
    ]);
  }
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
    // TKT-5: an assignee is checked first, in the same transaction (see assertAssigneeIsMember).
    async createTicket(
      project,
      reporterId,
      { title, description, type, priority, dueDate, assigneeId },
    ) {
      try {
        const ticket = await prisma.$transaction(async (tx) => {
          if (typeof assigneeId === 'string') {
            await assertAssigneeIsMember(tx, project.id, assigneeId);
          }
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
              // Missing or null: unassigned.
              assigneeId: assigneeId ?? null,
              dueDate: toDueDateColumn(dueDate),
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

    // TKT-2: the key's prefix must be this project's key, so WEB-3 under /projects/API/... is
    // a 404 and never another project's ticket. The query is also scoped by the project id
    // (architecture §6), and the (projectId, number) unique index finds the row directly.
    async getTicket(project, ticketKey) {
      const number = ticketNumberIn(project, ticketKey);
      const ticket = await prisma.ticket.findUnique({
        where: { projectId_number: { projectId: project.id, number } },
        select: TICKET_FIELDS,
      });
      if (!ticket) {
        throw ticketNotFound();
      }

      return toTicketResponse(project.key, ticket);
    },

    // TKT-3 (architecture §10.3): one transaction.
    // 1. Find the ticket by key, scoped by the project like getTicket.
    // 2. TKT-5: a new assignee must be a member of the project (null unassigns, no check).
    // 3. A new status puts the ticket at the bottom of the new column, like a /position move
    //    without neighbours (§10.2), so the (projectId, status, rank) order stays valid.
    // 4. The conditional update: `WHERE id AND updatedAt = <the client's updatedAt>`. In READ
    //    COMMITTED a concurrent save that commits first changes updatedAt (@updatedAt sets it on
    //    every update), so PostgreSQL re-checks the row and this update matches 0 rows: no lost
    //    update. 0 rows means the ticket was deleted (404) or changed (409); either way nothing
    //    was written. Only the picked fields reach Prisma; a missing field (undefined) stays as it is.
    async updateTicket(project, ticketKey, { updatedAt, dueDate, status, assigneeId, ...fields }) {
      const number = ticketNumberIn(project, ticketKey);

      const ticket = await prisma.$transaction(async (tx) => {
        const current = await tx.ticket.findUnique({
          where: { projectId_number: { projectId: project.id, number } },
          select: { id: true, status: true },
        });
        if (!current) {
          throw ticketNotFound();
        }

        if (typeof assigneeId === 'string') {
          await assertAssigneeIsMember(tx, project.id, assigneeId);
        }

        let rank: string | undefined;
        if (status !== undefined && status !== current.status) {
          const lastInStatus = await tx.ticket.findFirst({
            where: { projectId: project.id, status },
            orderBy: { rank: 'desc' },
            select: { rank: true },
          });
          rank = rankBetween(lastInStatus?.rank ?? null, null);
        }

        const { count } = await tx.ticket.updateMany({
          where: { id: current.id, projectId: project.id, updatedAt: new Date(updatedAt) },
          data: {
            title: fields.title,
            description: fields.description,
            type: fields.type,
            priority: fields.priority,
            status,
            rank,
            assigneeId,
            dueDate: dueDate === undefined ? undefined : toDueDateColumn(dueDate),
          },
        });
        if (count === 0) {
          const stillThere = await tx.ticket.findUnique({
            where: { id: current.id },
            select: { id: true },
          });
          throw stillThere
            ? new ConflictError(ErrorCode.EDIT_CONFLICT, EDIT_CONFLICT_MESSAGE)
            : ticketNotFound();
        }

        // ACT-1: the activity entries for a changed status or priority (and assignee, TKT-5) are
        // written here, in this transaction, so the history and the ticket change together.

        return tx.ticket.findUniqueOrThrow({ where: { id: current.id }, select: TICKET_FIELDS });
      });

      return toTicketResponse(project.key, ticket);
    },
  };
}
