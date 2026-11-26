import {
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  TICKET_DELETE_FORBIDDEN_MESSAGE,
  TICKET_NOT_FOUND_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';
import { createTestTickets } from '../helpers/tickets.js';

const TICKET_NOT_FOUND = {
  error: { code: ErrorCode.NOT_FOUND, message: TICKET_NOT_FOUND_MESSAGE },
};
const PROJECT_NOT_FOUND = {
  error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
};

describe('DELETE /api/projects/:projectKey/tickets/:ticketKey (TKT-4)', () => {
  let app: ReturnType<typeof createTestApp>;
  let matrix: ProjectAccessMatrix;

  // WEB-1 reported by the owner, WEB-2 reported by the member.
  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
    await createTestTickets(matrix.project, matrix.owner.id, ['Owner ticket']);
    await createTestTickets(matrix.project, matrix.member.id, ['Member ticket']);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const ticketUrl = (ticketKey: string, projectKey = matrix.project.key): string =>
    `/api/projects/${projectKey}/tickets/${ticketKey}`;
  const deleteTicket = (caller: Caller, url: string): request.Test =>
    requestAs(app, matrix, caller, 'delete', url);
  const ticketExists = async (number: number, projectId = matrix.project.id): Promise<boolean> =>
    (await testPrisma.ticket.count({ where: { projectId, number } })) === 1;

  describe('main path', () => {
    it('TKT-4: the reporter deletes their ticket (204, no body), and then GET gets 404', async () => {
      const response = await deleteTicket('member', ticketUrl('WEB-2'));

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect(await ticketExists(2)).toBe(false);

      const after = await requestAs(app, matrix, 'member', 'get', ticketUrl('WEB-2'));
      expect(after.status).toBe(404);
      expect(after.body).toEqual(TICKET_NOT_FOUND);
    });

    it('TKT-4: the owner deletes a ticket someone else reported', async () => {
      const response = await deleteTicket('owner', ticketUrl('WEB-2'));

      expect(response.status).toBe(204);
      expect(await ticketExists(2)).toBe(false);
    });

    it('TKT-4: the owner deletes a ticket they reported', async () => {
      const response = await deleteTicket('owner', ticketUrl('WEB-1'));

      expect(response.status).toBe(204);
      expect(await ticketExists(1)).toBe(false);
    });

    it('TKT-4: only that ticket is deleted; the other tickets and the project stay', async () => {
      await deleteTicket('owner', ticketUrl('WEB-1'));

      expect(await ticketExists(2)).toBe(true);
      expect(await testPrisma.project.count({ where: { id: matrix.project.id } })).toBe(1);
    });
  });

  describe('number never reused (TKT-1 key rule)', () => {
    it('TKT-4: after the newest ticket is deleted, the next ticket gets a new number', async () => {
      const deleted = await deleteTicket('member', ticketUrl('WEB-2'));
      expect(deleted.status).toBe(204);

      const created = await requestAs(
        app,
        matrix,
        'member',
        'post',
        `/api/projects/${matrix.project.key}/tickets`,
      ).send({ title: 'After the delete' });

      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ key: 'WEB-3', number: 3 });
      // WEB-2 stays gone: its number was not handed out again.
      const reused = await requestAs(app, matrix, 'member', 'get', ticketUrl('WEB-2'));
      expect(reused.status).toBe(404);
    });

    it('TKT-4: deleting every ticket does not reset the numbering', async () => {
      await deleteTicket('owner', ticketUrl('WEB-1'));
      await deleteTicket('owner', ticketUrl('WEB-2'));

      const [next] = await createTestTickets(matrix.project, matrix.owner.id, ['Fresh start']);

      expect(next?.key).toBe('WEB-3');
    });
  });

  describe('forbidden', () => {
    it("TKT-4: a member who didn't report the ticket gets 403 and the ticket stays", async () => {
      const response = await deleteTicket('member', ticketUrl('WEB-1'));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: { code: ErrorCode.FORBIDDEN, message: TICKET_DELETE_FORBIDDEN_MESSAGE },
      });
      expect(await ticketExists(1)).toBe(true);
    });

    it('TKT-4: a cross-site request from the reporter gets 403 and the ticket stays', async () => {
      const response = await request(app)
        .delete(ticketUrl('WEB-2'))
        .set('Cookie', matrix.cookies.member ?? '')
        .set('Sec-Fetch-Site', 'cross-site');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: { code: ErrorCode.FORBIDDEN } });
      expect(await ticketExists(2)).toBe(true);
    });
  });

  describe('not found', () => {
    it('TKT-4: an outsider gets the same 404 as for a missing project, and the ticket stays', async () => {
      const outsider = await deleteTicket('outsider', ticketUrl('WEB-1'));
      const missing = await deleteTicket('outsider', ticketUrl('NOPE-1', 'NOPE'));

      expect(outsider.status).toBe(404);
      expect(outsider.body).toEqual(PROJECT_NOT_FOUND);
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual(PROJECT_NOT_FOUND);
      expect(await ticketExists(1)).toBe(true);
    });

    it("TKT-4: another project's key prefix gets 404, and neither project's ticket is deleted", async () => {
      // API-1 exists, but WEB-1 must not be deletable through /projects/API/...
      const api = await createProjectsService(testPrisma).createProject(matrix.owner.id, {
        key: 'API',
        name: 'API',
        description: null,
      });
      await createTestTickets(api, matrix.owner.id, ['API ticket']);

      const response = await deleteTicket('owner', ticketUrl('WEB-1', 'API'));

      expect(response.status).toBe(404);
      expect(response.body).toEqual(TICKET_NOT_FOUND);
      expect(await ticketExists(1)).toBe(true);
      expect(await ticketExists(1, api.id)).toBe(true);
    });

    it.each(['web-1', 'WEB-01', 'WEB-0', 'WEB1', 'WEB-99999999999'])(
      'TKT-4: a malformed key (%s) gets 404 "Ticket not found"',
      async (ticketKey) => {
        const response = await deleteTicket('owner', ticketUrl(ticketKey));

        expect(response.status).toBe(404);
        expect(response.body).toEqual(TICKET_NOT_FOUND);
      },
    );

    it('TKT-4: an unknown number gets 404, for the owner and for a member', async () => {
      const owner = await deleteTicket('owner', ticketUrl('WEB-9'));
      const member = await deleteTicket('member', ticketUrl('WEB-9'));

      expect(owner.status).toBe(404);
      expect(owner.body).toEqual(TICKET_NOT_FOUND);
      // A member gets 404 too, not 403: there is no ticket to be forbidden from.
      expect(member.status).toBe(404);
      expect(member.body).toEqual(TICKET_NOT_FOUND);
    });

    it('TKT-4: deleting it again gets 404', async () => {
      await deleteTicket('member', ticketUrl('WEB-2'));
      const again = await deleteTicket('member', ticketUrl('WEB-2'));

      expect(again.status).toBe(404);
      expect(again.body).toEqual(TICKET_NOT_FOUND);
    });

    it('TKT-4: two deletes at the same moment: one gets 204, the other 404', async () => {
      const responses = await Promise.all([
        deleteTicket('member', ticketUrl('WEB-2')),
        deleteTicket('owner', ticketUrl('WEB-2')),
      ]);

      expect(responses.map((response) => response.status).sort((a, b) => a - b)).toEqual([
        204, 404,
      ]);
      expect(await ticketExists(2)).toBe(false);
    });
  });

  describe('access', () => {
    it.each([
      ['owner', 204],
      ['member', 403],
      ['outsider', 404],
      ['visitor', 401],
    ] as const)("TKT-4: %s deleting the owner's ticket gets %i", async (caller, status) => {
      const response = await deleteTicket(caller, ticketUrl('WEB-1'));

      expect(response.status).toBe(status);
    });

    it('TKT-4: a visitor gets 401 UNAUTHENTICATED and the ticket stays', async () => {
      const response = await deleteTicket('visitor', ticketUrl('WEB-2'));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
      expect(await ticketExists(2)).toBe(true);
    });
  });
});
