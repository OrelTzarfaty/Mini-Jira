import { BOARD_COLUMN_LIMIT, BOARD_STATUSES, boardColumnSchema } from '@mini-jira/shared';
import type { Board, BoardColumn, Status } from '@mini-jira/shared';

import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { encodeBoardCursor } from '../../lib/board-cursor.js';
import type { BoardCursor } from '../../lib/board-cursor.js';
import { formatTicketKey } from '../../lib/ticket-key.js';
import { toCalendarDay } from './tickets.service.js';
import type { TicketProject } from './tickets.service.js';

export interface BoardService {
  /** BRD-1: all four columns in workflow order, each with its total and its first 50 cards. */
  getBoard(project: TicketProject): Promise<Board>;
}

// What a card needs, plus the rank for the cursor (stripped from the response).
const CARD_FIELDS = {
  id: true,
  number: true,
  title: true,
  type: true,
  priority: true,
  status: true,
  dueDate: true,
  updatedAt: true,
  rank: true,
  assignee: { select: { id: true, name: true } },
} as const;

type CardRow = Prisma.TicketGetPayload<{ select: typeof CARD_FIELDS }>;

// The board is read in one REPEATABLE READ transaction: every query sees the same snapshot, so
// a column's total always matches its cards, even while other users create or move tickets. A
// read-only transaction never fails with a serialization error in PostgreSQL, so it needs no
// retry.
const SNAPSHOT = { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead };

/**
 * One page of a column, in rank order with the id as the tie-breaker. The (projectId, status,
 * rank) index finds the column and returns it already sorted, so PostgreSQL reads only about 51
 * index entries, however long the column is. After a cursor, "rank >= cursor rank" is the index
 * range; the OR then skips the cards with the same rank up to and including the cursor's card.
 * One extra row is read to know whether there is a next page, without a second count.
 */
function findColumnPage(
  db: Prisma.TransactionClient,
  projectId: string,
  status: Status,
  after: BoardCursor | null,
): Promise<CardRow[]> {
  return db.ticket.findMany({
    where: {
      projectId,
      status,
      ...(after && {
        AND: [
          { rank: { gte: after.rank } },
          { OR: [{ rank: { gt: after.rank } }, { id: { gt: after.id } }] },
        ],
      }),
    },
    orderBy: [{ rank: 'asc' }, { id: 'asc' }],
    take: BOARD_COLUMN_LIMIT + 1,
    select: CARD_FIELDS,
  });
}

/** The API shape of a column, parsed through the shared schema (a DTO, standards §6.3). */
function toColumnResponse(
  projectKey: string,
  status: Status,
  total: number,
  rows: CardRow[],
): BoardColumn {
  const cards = rows.slice(0, BOARD_COLUMN_LIMIT);
  const last = cards.at(-1);
  const hasMore = rows.length > BOARD_COLUMN_LIMIT;

  // The schema strips the rank: it is only used for the cursor.
  return boardColumnSchema.parse({
    status,
    total,
    items: cards.map((card) => ({
      ...card,
      key: formatTicketKey(projectKey, card.number),
      dueDate: card.dueDate === null ? null : toCalendarDay(card.dueDate),
      updatedAt: card.updatedAt.toISOString(),
    })),
    nextCursor: hasMore && last ? encodeBoardCursor(last) : null,
  });
}

export function createBoardService(prisma: PrismaClient): BoardService {
  return {
    // BRD-1: one groupBy for the four totals and one bounded query per column: five queries
    // however many tickets the project has (no N+1). A status without tickets has no group, so
    // its total is 0.
    async getBoard(project) {
      const { counts, pages } = await prisma.$transaction(async (tx) => {
        const groups = await tx.ticket.groupBy({
          by: ['status'],
          where: { projectId: project.id },
          _count: { _all: true },
        });
        const columnPages = await Promise.all(
          BOARD_STATUSES.map((status) => findColumnPage(tx, project.id, status, null)),
        );

        return { counts: groups, pages: columnPages };
      }, SNAPSHOT);

      const totals = new Map(counts.map((group) => [group.status, group._count._all]));

      return {
        columns: BOARD_STATUSES.map((status, index) =>
          toColumnResponse(project.key, status, totals.get(status) ?? 0, pages[index] ?? []),
        ),
      };
    },
  };
}
