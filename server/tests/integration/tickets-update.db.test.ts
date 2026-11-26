import {
  EDIT_CONFLICT_MESSAGE,
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  Status,
  TICKET_NOT_FOUND_MESSAGE,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_UPDATE_EMPTY_MESSAGE,
  ticketSchema,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import type { Express } from 'express';
import type request from 'supertest';
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

/** The stored rank of a ticket: internal, so the API never returns it. */
async function rankOf(ticketId: string): Promise<string> {
  const { rank } = await testPrisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    select: { rank: true },
  });

  return rank;
}

describe('PATCH /api/projects/:projectKey/tickets/:ticketKey (TKT-3)', () => {
  let app: Express;
  let matrix: ProjectAccessMatrix;
  let ticket: Ticket;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
    const [created] = await createTestTickets(matrix.project, matrix.owner.id, ['Fix login']);
    if (!created) throw new Error('The test ticket was not created');
    ticket = created;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const ticketUrl = (ticketKey = 'WEB-1', projectKey = matrix.project.key): string =>
    `/api/projects/${projectKey}/tickets/${ticketKey}`;
  const patchTicket = (caller: Caller, body: object, url = ticketUrl()): request.Test =>
    requestAs(app, matrix, caller, 'patch', url).send(body);
  /** An edit based on the ticket as it was loaded (its current updatedAt). */
  const edit = (fields: object, caller: Caller = 'member'): request.Test =>
    patchTicket(caller, { updatedAt: ticket.updatedAt, ...fields });

  describe('main path', () => {
    it('TKT-3: a member edits every field; the ticket is saved and gets a new updatedAt', async () => {
      const response = await edit({
        title: '  Fix the login page  ',
        description: '  Steps:\n1. Open /login  ',
        type: 'BUG',
        priority: 'CRITICAL',
        status: Status.IN_PROGRESS,
        dueDate: '2026-12-24',
      });

      expect(response.status).toBe(200);
      // strict(): the GET shape exactly (no rank, no row ids).
      const updated = ticketSchema.strict().parse(response.body);
      expect(updated).toEqual({
        ...ticket,
        title: 'Fix the login page',
        description: 'Steps:\n1. Open /login',
        type: 'BUG',
        priority: 'CRITICAL',
        status: Status.IN_PROGRESS,
        dueDate: '2026-12-24',
        updatedAt: updated.updatedAt,
      });
      expect(updated.updatedAt).not.toBe(ticket.updatedAt);
      expect(new Date(updated.updatedAt) > new Date(ticket.updatedAt)).toBe(true);

      // Saved: a later GET returns the same ticket.
      const reloaded = await requestAs(app, matrix, 'owner', 'get', ticketUrl());
      expect(reloaded.body).toEqual(updated);
    });

    it('TKT-3: a missing field stays as it is; null clears the description and due date', async () => {
      const first = await edit({ description: 'Details', dueDate: '2026-12-01' });
      const cleared = await patchTicket('owner', {
        updatedAt: (first.body as Ticket).updatedAt,
        description: '   ',
        dueDate: null,
      });

      expect(cleared.status).toBe(200);
      expect(cleared.body).toMatchObject({
        title: 'Fix login',
        type: 'TASK',
        priority: 'MEDIUM',
        status: Status.TODO,
        description: null,
        dueDate: null,
      });
    });

    it('TKT-3: the updatedAt from the response can be used for the next edit', async () => {
      const first = await edit({ title: 'First' });
      const second = await patchTicket('member', {
        updatedAt: (first.body as Ticket).updatedAt,
        title: 'Second',
      });

      expect(second.status).toBe(200);
      expect(second.body).toMatchObject({ title: 'Second' });
    });
  });

  describe('status change', () => {
    it('TKT-3: a new status puts the ticket at the bottom of that column', async () => {
      // WEB-2 and WEB-3 go to In Progress first (in that order), then WEB-1 follows them.
      const others = await createTestTickets(matrix.project, matrix.owner.id, ['Two', 'Three']);
      for (const moved of others) {
        const response = await patchTicket(
          'member',
          { updatedAt: moved.updatedAt, status: Status.IN_PROGRESS },
          ticketUrl(moved.key),
        );
        expect(response.status).toBe(200);
      }

      const response = await edit({ status: Status.IN_PROGRESS });

      expect(response.status).toBe(200);
      const column = await testPrisma.ticket.findMany({
        where: { projectId: matrix.project.id, status: Status.IN_PROGRESS },
        orderBy: { rank: 'asc' },
        select: { number: true },
      });
      expect(column.map(({ number }) => number)).toEqual([2, 3, 1]);
    });

    it('TKT-3: an edit that keeps the status keeps the rank', async () => {
      const rankBefore = await rankOf(ticket.id);

      const response = await edit({ status: Status.TODO, title: 'Renamed' });

      expect(response.status).toBe(200);
      expect(await rankOf(ticket.id)).toBe(rankBefore);
    });
  });

  describe('validation', () => {
    it(`TKT-3: a title over ${TICKET_TITLE_MAX_LENGTH} characters gets 400 with details on title`, async () => {
      const response = await edit({ title: 'x'.repeat(TICKET_TITLE_MAX_LENGTH + 1) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: `Title must be at most ${TICKET_TITLE_MAX_LENGTH} characters`,
          details: [
            {
              field: 'title',
              message: `Title must be at most ${TICKET_TITLE_MAX_LENGTH} characters`,
            },
          ],
        },
      });
    });

    it.each([
      ['type', 'EPIC', 'Type must be TASK, BUG or STORY'],
      ['priority', 'urgent', 'Priority must be LOW, MEDIUM, HIGH or CRITICAL'],
      ['status', 'BLOCKED', 'Status must be TODO, IN_PROGRESS, IN_REVIEW or DONE'],
    ])('TKT-3: an invalid %s (%s) gets 400 with details on it', async (field, value, message) => {
      const response = await edit({ [field]: value });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: { code: ErrorCode.VALIDATION_ERROR, message, details: [{ field, message }] },
      });
    });

    it.each(['estimateMinutes', 'number', 'rank', 'reporterId', 'key'])(
      'TKT-3: the field %s is rejected with 400 "Unknown field"',
      async (field) => {
        const response = await edit({ title: 'Renamed', [field]: 'x' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Unknown field',
            details: [{ field, message: 'Unknown field' }],
          },
        });
      },
    );

    it('TKT-3: a body with only updatedAt gets 400 "Change at least one field"', async () => {
      const response = await edit({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: { code: ErrorCode.VALIDATION_ERROR, message: TICKET_UPDATE_EMPTY_MESSAGE },
      });
    });

    it('TKT-3: a missing updatedAt gets 400 with details on updatedAt', async () => {
      const response = await patchTicket('member', { title: 'Renamed' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          details: [{ field: 'updatedAt', message: 'updatedAt is required' }],
        },
      });
    });

    it('TKT-3: a rejected edit saves nothing', async () => {
      await edit({ title: 'Renamed', priority: 'urgent' });

      const stored = await requestAs(app, matrix, 'member', 'get', ticketUrl());
      expect(stored.body).toEqual(ticket);
    });
  });

  describe('conflict (CON-1)', () => {
    it('TKT-3: a stale updatedAt gets 409 EDIT_CONFLICT and the first edit is kept', async () => {
      const first = await edit({ title: 'Saved first' }, 'owner');
      // The member still has the ticket as it was before the owner's save.
      const second = await edit({ title: 'Saved second', priority: 'LOW' }, 'member');

      expect(first.status).toBe(200);
      expect(second.status).toBe(409);
      expect(second.body).toEqual({
        error: { code: ErrorCode.EDIT_CONFLICT, message: EDIT_CONFLICT_MESSAGE },
      });
      const stored = await requestAs(app, matrix, 'member', 'get', ticketUrl());
      expect(stored.body).toEqual(first.body);
    });

    it('TKT-3: two edits sent at the same moment with the same updatedAt: one 200, one 409', async () => {
      const responses = await Promise.all([
        edit({ title: 'From the owner' }, 'owner'),
        edit({ title: 'From the member' }, 'member'),
      ]);

      expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
      const winner = responses.find(({ status }) => status === 200);
      const stored = await requestAs(app, matrix, 'member', 'get', ticketUrl());
      expect(stored.body).toEqual(winner?.body);
    });

    it('TKT-3: an updatedAt in a valid format but not the loaded one gets 409', async () => {
      const response = await patchTicket('member', {
        updatedAt: '2020-01-01T00:00:00.000Z',
        title: 'Renamed',
      });

      expect(response.status).toBe(409);
    });
  });

  describe('not found', () => {
    const TICKET_NOT_FOUND = {
      error: { code: ErrorCode.NOT_FOUND, message: TICKET_NOT_FOUND_MESSAGE },
    };

    it("TKT-3: another project's key prefix gets 404 and that ticket is not changed", async () => {
      const api = await createProjectsService(testPrisma).createProject(matrix.owner.id, {
        key: 'API',
        name: 'API',
        description: null,
      });
      const [apiTicket] = await createTestTickets(api, matrix.owner.id, ['API ticket']);

      // WEB-1 under the API project's URL: the prefix is not the project's key.
      const wrongPrefix = await patchTicket(
        'owner',
        { updatedAt: ticket.updatedAt, title: 'Hacked' },
        ticketUrl('WEB-1', 'API'),
      );
      // API-1 under the WEB project's URL.
      const otherProject = await patchTicket(
        'owner',
        { updatedAt: apiTicket?.updatedAt, title: 'Hacked' },
        ticketUrl('API-1'),
      );

      expect(wrongPrefix.status).toBe(404);
      expect(wrongPrefix.body).toEqual(TICKET_NOT_FOUND);
      expect(otherProject.status).toBe(404);
      expect(otherProject.body).toEqual(TICKET_NOT_FOUND);
      const titles = await testPrisma.ticket.findMany({ select: { title: true } });
      expect(titles.map(({ title }) => title).sort()).toEqual(['API ticket', 'Fix login']);
    });

    it.each(['WEB-2', 'web-1', 'WEB-01'])(
      'TKT-3: the key %s gets 404 "Ticket not found"',
      async (key) => {
        const response = await patchTicket(
          'member',
          { updatedAt: ticket.updatedAt, title: 'Renamed' },
          ticketUrl(key),
        );

        expect(response.status).toBe(404);
        expect(response.body).toEqual(TICKET_NOT_FOUND);
      },
    );
  });

  describe('access', () => {
    it.each([
      ['owner', 200],
      ['member', 200],
      ['outsider', 404],
      ['visitor', 401],
    ] as const)('TKT-3: %s gets %i', async (caller, status) => {
      const response = await edit({ title: 'Renamed' }, caller);

      expect(response.status).toBe(status);
    });

    it('TKT-3: an outsider gets the "Project not found" 404, before any validation, and nothing changes', async () => {
      const valid = await edit({ title: 'Hacked' }, 'outsider');
      const invalid = await edit({ title: '', rank: 'a0' }, 'outsider');

      for (const response of [valid, invalid]) {
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
        });
      }
      const stored = await requestAs(app, matrix, 'owner', 'get', ticketUrl());
      expect(stored.body).toEqual(ticket);
    });

    it('TKT-3: a visitor gets 401 UNAUTHENTICATED', async () => {
      const response = await edit({ title: 'Renamed' }, 'visitor');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      });
    });
  });
});
