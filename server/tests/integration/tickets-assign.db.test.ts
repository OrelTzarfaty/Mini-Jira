import {
  ASSIGNEE_NOT_MEMBER_MESSAGE,
  EDIT_CONFLICT_MESSAGE,
  ErrorCode,
  INVALID_ASSIGNEE_ID_MESSAGE,
  Role,
  ticketSchema,
} from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import type { Express } from 'express';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';
import { createTestTickets } from '../helpers/tickets.js';

// A valid UUID that belongs to no user.
const UNKNOWN_USER_ID = '0b6f2c1e-8f4a-4c3b-9a7d-2e5f1a3b4c6d';

describe('Assign a ticket (TKT-5)', () => {
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

  const ticketsUrl = `/api/projects/WEB/tickets`;
  const ticketUrl = `${ticketsUrl}/WEB-1`;
  /** An edit based on the ticket as it was loaded (its current updatedAt). */
  const edit = (fields: object, caller: Caller = 'member'): request.Test =>
    requestAs(app, matrix, caller, 'patch', ticketUrl).send({
      updatedAt: ticket.updatedAt,
      ...fields,
    });
  const create = (body: object, caller: Caller = 'member'): request.Test =>
    requestAs(app, matrix, caller, 'post', ticketsUrl).send(body);
  const storedAssigneeId = async (): Promise<string | null> =>
    (await testPrisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).assigneeId;

  const expectAssigneeError = (response: request.Response, message: string): void => {
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message,
        details: [{ field: 'assigneeId', message }],
      },
    });
  };

  describe('edit (PATCH)', () => {
    it('TKT-5: a member assigns the ticket to another member; GET shows the assignee', async () => {
      const response = await edit({ assigneeId: matrix.owner.id });

      expect(response.status).toBe(200);
      const updated = ticketSchema.strict().parse(response.body);
      expect(updated.assignee).toEqual({ id: matrix.owner.id, name: matrix.owner.name });
      expect(updated.updatedAt).not.toBe(ticket.updatedAt);
      // Only the assignee changed.
      expect(updated).toEqual({
        ...ticket,
        assignee: updated.assignee,
        updatedAt: updated.updatedAt,
      });

      const reloaded = await requestAs(app, matrix, 'owner', 'get', ticketUrl);
      expect(reloaded.body).toEqual(updated);
    });

    it('TKT-5: a member assigns the ticket to themselves', async () => {
      const response = await edit({ assigneeId: matrix.member.id }, 'member');

      expect(response.status).toBe(200);
      expect((response.body as Ticket).assignee).toEqual({
        id: matrix.member.id,
        name: matrix.member.name,
      });
      expect(await storedAssigneeId()).toBe(matrix.member.id);
    });

    it('TKT-5: null unassigns the ticket', async () => {
      const assigned = await edit({ assigneeId: matrix.member.id });
      const response = await requestAs(app, matrix, 'owner', 'patch', ticketUrl).send({
        updatedAt: (assigned.body as Ticket).updatedAt,
        assigneeId: null,
      });

      expect(response.status).toBe(200);
      expect((response.body as Ticket).assignee).toBeNull();
      expect(await storedAssigneeId()).toBeNull();
    });

    it('TKT-5: a missing assigneeId leaves the assignee as it is', async () => {
      const assigned = await edit({ assigneeId: matrix.member.id });
      const response = await requestAs(app, matrix, 'owner', 'patch', ticketUrl).send({
        updatedAt: (assigned.body as Ticket).updatedAt,
        title: 'Renamed',
      });

      expect(response.status).toBe(200);
      expect((response.body as Ticket).assignee).toEqual({
        id: matrix.member.id,
        name: matrix.member.name,
      });
    });

    it('TKT-5: a user who is not a project member gets 400 on assigneeId, nothing saved', async () => {
      const response = await edit({ assigneeId: matrix.outsider.id, title: 'Renamed' });

      expectAssigneeError(response, ASSIGNEE_NOT_MEMBER_MESSAGE);
      const stored = await testPrisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(stored.assigneeId).toBeNull();
      expect(stored.title).toBe('Fix login');
      expect(stored.updatedAt.toISOString()).toBe(ticket.updatedAt);
    });

    it('TKT-5: a member of another project only is not a member here (400)', async () => {
      // The outsider owns a project of their own: being a member elsewhere doesn't count.
      await testPrisma.project.create({
        data: {
          key: 'API',
          name: 'API',
          members: { create: { userId: matrix.outsider.id, role: Role.OWNER } },
        },
      });

      expectAssigneeError(
        await edit({ assigneeId: matrix.outsider.id }),
        ASSIGNEE_NOT_MEMBER_MESSAGE,
      );
    });

    it('TKT-5: an id no user has gets the same 400 as a non-member', async () => {
      expectAssigneeError(await edit({ assigneeId: UNKNOWN_USER_ID }), ASSIGNEE_NOT_MEMBER_MESSAGE);
      expect(await storedAssigneeId()).toBeNull();
    });

    it.each(['not-a-uuid', '', 42])(
      'TKT-5: an assigneeId that is not a UUID (%j) gets 400',
      async (assigneeId) => {
        expectAssigneeError(await edit({ assigneeId }), INVALID_ASSIGNEE_ID_MESSAGE);
      },
    );

    it('TKT-5, CON-1: an assignee change on a stale updatedAt gets 409, nothing saved', async () => {
      const first = await edit({ title: 'Saved first' }, 'owner');
      expect(first.status).toBe(200);

      // Still the updatedAt from before the owner's save.
      const response = await edit({ assigneeId: matrix.member.id });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: { code: ErrorCode.EDIT_CONFLICT, message: EDIT_CONFLICT_MESSAGE },
      });
      expect(await storedAssigneeId()).toBeNull();
    });
  });

  describe('create (POST)', () => {
    it('TKT-5: a ticket is created with an assignee', async () => {
      const response = await create({ title: 'Assigned', assigneeId: matrix.owner.id });

      expect(response.status).toBe(201);
      const created = ticketSchema.strict().parse(response.body);
      expect(created.assignee).toEqual({ id: matrix.owner.id, name: matrix.owner.name });
      const stored = await testPrisma.ticket.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.assigneeId).toBe(matrix.owner.id);
    });

    it('TKT-5: a null assigneeId creates an unassigned ticket', async () => {
      const response = await create({ title: 'Nobody', assigneeId: null });

      expect(response.status).toBe(201);
      expect((response.body as Ticket).assignee).toBeNull();
    });

    it.each([
      ['a non-member', (): string => matrix.outsider.id],
      ['an unknown user id', (): string => UNKNOWN_USER_ID],
    ])(
      'TKT-5: %s as assignee gets 400 on assigneeId, no ticket and no number spent',
      async (_case, assigneeId) => {
        const response = await create({ title: 'T', assigneeId: assigneeId() });

        expectAssigneeError(response, ASSIGNEE_NOT_MEMBER_MESSAGE);
        expect(await testPrisma.ticket.count({ where: { projectId: matrix.project.id } })).toBe(1);
        const { ticketCounter } = await testPrisma.project.findUniqueOrThrow({
          where: { id: matrix.project.id },
        });
        expect(ticketCounter).toBe(1);
      },
    );

    it('TKT-5: an assigneeId that is not a UUID gets 400', async () => {
      expectAssigneeError(
        await create({ title: 'T', assigneeId: 'nope' }),
        INVALID_ASSIGNEE_ID_MESSAGE,
      );
    });
  });
});
