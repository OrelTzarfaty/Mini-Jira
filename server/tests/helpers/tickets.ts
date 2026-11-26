import type { Ticket } from '@mini-jira/shared';

import { createTicketsService } from '../../src/modules/tickets/tickets.service.js';
import { testPrisma } from './database.js';

/**
 * TKT-1: creates one To Do ticket per title in the project, through the real service (so keys,
 * ranks and the ticket counter are set as in the app), and returns them in order.
 */
export async function createTestTickets(
  project: { id: string; key: string },
  reporterId: string,
  titles: readonly string[],
): Promise<Ticket[]> {
  const ticketsService = createTicketsService(testPrisma);
  const tickets: Ticket[] = [];

  // One after the other, so the keys follow the order of the titles.
  for (const title of titles) {
    tickets.push(
      await ticketsService.createTicket(project, reporterId, {
        title,
        description: null,
        type: 'TASK',
        priority: 'MEDIUM',
        dueDate: null,
      }),
    );
  }

  return tickets;
}
