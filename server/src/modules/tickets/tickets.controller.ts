import type { CreateTicketInput, Ticket } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { requireUserId } from '../../middleware/require-auth.js';
import type { TicketsService } from './tickets.service.js';

// The body type is safe because validateBody(createTicketSchema) runs before this handler.
type CreateTicketHandler = RequestHandler<{ projectKey: string }, Ticket, CreateTicketInput>;

export interface TicketsController {
  create: CreateTicketHandler;
}

export function createTicketsController(ticketsService: TicketsService): TicketsController {
  return {
    // TKT-1: any member may create a ticket; the caller becomes its reporter.
    async create(req, res) {
      const userId = requireUserId(req);
      const { project } = requireProjectAccess(req);
      const ticket = await ticketsService.createTicket(project, userId, req.body);
      req.log.info({ userId, projectId: project.id, ticketId: ticket.id }, 'Ticket created');
      res.status(201).json(ticket);
    },
  };
}
