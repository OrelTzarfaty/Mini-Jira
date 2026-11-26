import {
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  Status,
  TICKET_NOT_FOUND_MESSAGE,
  ticketSchema,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import type { Express } from 'express';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { createTicketsService } from '../../src/modules/tickets/tickets.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';

const TICKET_NOT_FOUND = {
  error: { code: ErrorCode.NOT_FOUND, message: TICKET_NOT_FOUND_MESSAGE },
};

/** Creates `count` tickets through the real TKT-1 service, so keys and numbers are real. */
async function createTickets(
  project: { id: string; key: string },
  reporterId: string,
  count: number,
): Promise<Ticket[]> {
  const service = createTicketsService(testPrisma);
  const tickets: Ticket[] = [];
  for (let index = 1; index <= count; index += 1) {
    tickets.push(
      await service.createTicket(project, reporterId, {
        title: `Ticket ${index}`,
        description: null,
        type: 'TASK',
        priority: 'MEDIUM',
        dueDate: null,
      }),
    );
  }

  return tickets;
}

describe('GET /api/projects/:projectKey/tickets/:ticketKey (TKT-2)', () => {
  let app: Express;
  let matrix: ProjectAccessMatrix;
  let created: Ticket | undefined;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
    [created] = await createTickets(matrix.project, matrix.owner.id, 1);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const ticketUrl = (ticketKey: string, projectKey = matrix.project.key): string =>
    `/api/projects/${projectKey}/tickets/${ticketKey}`;
  const getTicket = (caller: Caller, url: string): request.Test =>
    requestAs(app, matrix, caller, 'get', url);

  describe('main path', () => {
    it('TKT-2: a member gets the ticket by its key, in the create shape, not cached', async () => {
      const response = await getTicket('member', ticketUrl('WEB-1'));

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      // strict(): exactly the documented fields (no rank, no row ids), equal to what create returned.
      expect(ticketSchema.strict().parse(response.body)).toEqual(created);
      expect(response.body).toMatchObject({
        key: 'WEB-1',
        number: 1,
        status: Status.TODO,
        reporter: { id: matrix.owner.id, name: matrix.owner.name },
        assignee: null,
      });
    });

    it('TKT-2: the owner gets the ticket too', async () => {
      const response = await getTicket('owner', ticketUrl('WEB-1'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created);
    });
  });

  describe('not found', () => {
    it("TKT-2: another project's key prefix gets 404, even when this project has that number", async () => {
      // A second project with tickets 1-3, so API-3 exists but WEB-3 must not be found under it.
      const api = await createProjectsService(testPrisma).createProject(matrix.owner.id, {
        key: 'API',
        name: 'API',
        description: null,
      });
      await createTickets(matrix.project, matrix.owner.id, 2);
      await createTickets(api, matrix.owner.id, 3);

      const wrongPrefix = await getTicket('owner', ticketUrl('WEB-3', 'API'));
      const ownKey = await getTicket('owner', ticketUrl('API-3', 'API'));

      expect(wrongPrefix.status).toBe(404);
      expect(wrongPrefix.body).toEqual(TICKET_NOT_FOUND);
      expect(ownKey.status).toBe(200);
      expect(ownKey.body).toMatchObject({ key: 'API-3', title: 'Ticket 3' });
    });

    it('TKT-2: an unknown number gets 404 "Ticket not found"', async () => {
      const response = await getTicket('member', ticketUrl('WEB-2'));

      expect(response.status).toBe(404);
      expect(response.body).toEqual(TICKET_NOT_FOUND);
    });

    it.each([
      'web-1',
      'WEB-01',
      'WEB-0',
      'WEB-',
      'WEB1',
      '1',
      'WEB-1.5',
      'WEB--1',
      'WEB-99999999999',
      'WEB-1%20',
    ])('TKT-2: a malformed key (%s) gets 404 "Ticket not found", not data', async (ticketKey) => {
      const response = await getTicket('member', ticketUrl(ticketKey));

      expect(response.status).toBe(404);
      expect(response.body).toEqual(TICKET_NOT_FOUND);
    });
  });

  describe('access', () => {
    it.each([
      ['owner', 200],
      ['member', 200],
      ['outsider', 404],
      ['visitor', 401],
    ] as const)('TKT-2: %s gets %i', async (caller, status) => {
      const response = await getTicket(caller, ticketUrl('WEB-1'));

      expect(response.status).toBe(status);
    });

    it('TKT-2: an outsider gets the same 404 as for a missing project, and no ticket data', async () => {
      const outsider = await getTicket('outsider', ticketUrl('WEB-1'));
      const missing = await getTicket('outsider', ticketUrl('NOPE-1', 'NOPE'));

      expect(outsider.status).toBe(404);
      expect(outsider.body).toEqual({
        error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
      });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual(outsider.body);
    });

    it('TKT-2: a visitor gets 401 UNAUTHENTICATED', async () => {
      const response = await getTicket('visitor', ticketUrl('WEB-1'));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
    });
  });
});
