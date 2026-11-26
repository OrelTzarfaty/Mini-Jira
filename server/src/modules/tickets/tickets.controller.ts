import type { CreateTicketInput, Ticket, UpdateTicketInput } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { requireUserId } from '../../middleware/require-auth.js';
import type { TicketsService } from './tickets.service.js';

// The body type is safe because validateBody(createTicketSchema) runs before this handler.
type CreateTicketHandler = RequestHandler<{ projectKey: string }, Ticket, CreateTicketInput>;
// A Record, not an interface, so it fits the index-signature type Express expects for params.
type TicketParams = Record<'projectKey' | 'ticketKey', string>;
type GetTicketHandler = RequestHandler<TicketParams, Ticket>;
// The body type is safe because validateBody(updateTicketSchema) runs before this handler.
type UpdateTicketHandler = RequestHandler<TicketParams, Ticket, UpdateTicketInput>;
type DeleteTicketHandler = RequestHandler<TicketParams, void>;

export interface TicketsController {
  create: CreateTicketHandler;
  get: GetTicketHandler;
  update: UpdateTicketHandler;
  delete: DeleteTicketHandler;
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

    // TKT-2: loadProjectAccess already checked that the caller is a member of the project.
    // Project data, so no browser or shared cache keeps it.
    async get(req, res) {
      const { project } = requireProjectAccess(req);
      const ticket = await ticketsService.getTicket(project, req.params.ticketKey);
      res.set('Cache-Control', 'no-store');
      res.json(ticket);
    },

    // TKT-3: any member may edit a ticket; a stale updatedAt gets 409 EDIT_CONFLICT (CON-1).
    async update(req, res) {
      const userId = requireUserId(req);
      const { project } = requireProjectAccess(req);
      const ticket = await ticketsService.updateTicket(project, req.params.ticketKey, req.body);
      req.log.info({ userId, projectId: project.id, ticketId: ticket.id }, 'Ticket updated');
      res.json(ticket);
    },

    // TKT-4: any member may ask; the service allows only the reporter or the project owner.
    async delete(req, res) {
      const userId = requireUserId(req);
      const { project, role } = requireProjectAccess(req);
      const { ticketKey } = req.params;
      await ticketsService.deleteTicket(project, ticketKey, { userId, role });
      req.log.info({ userId, projectId: project.id, ticketKey }, 'Ticket deleted');
      res.status(204).end();
    },
  };
}
