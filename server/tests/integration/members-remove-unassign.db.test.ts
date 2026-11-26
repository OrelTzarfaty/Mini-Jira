import { EDIT_CONFLICT_MESSAGE, ErrorCode, Role } from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import type { Express } from 'express';
import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createMembersService } from '../../src/modules/members/members.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';
import { createTestTickets } from '../helpers/tickets.js';

const POLL_INTERVAL_MS = 20;
const POLL_LIMIT_MS = 5_000;

/** How many sessions on the test database are waiting for a row lock right now. */
async function lockWaiters(): Promise<number> {
  const [row] = await testPrisma.$queryRaw<{ waiting: number }[]>`
    SELECT count(*)::int AS waiting
    FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'`;

  return row?.waiting ?? 0;
}

/** Polls until `done()` is true, or fails the test after POLL_LIMIT_MS. */
async function waitUntil(done: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + POLL_LIMIT_MS;
  while (!(await done())) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for the database');
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * The test Prisma client, except that `ticket.updateMany` fails inside a transaction: it makes
 * the unassign step of a member removal fail after the membership delete already ran.
 */
function prismaWithFailingUnassign(): PrismaClient {
  const failingTx = (tx: object): object =>
    new Proxy(tx, {
      get: (target, property) =>
        property === 'ticket'
          ? { updateMany: () => Promise.reject(new Error('Unassign failed (test)')) }
          : (Reflect.get(target, property) as unknown),
    });

  return new Proxy(testPrisma, {
    get: (target, property) =>
      property === '$transaction'
        ? (callback: (tx: object) => Promise<unknown>) =>
            target.$transaction((tx) => callback(failingTx(tx)))
        : (Reflect.get(target, property) as unknown),
  });
}

describe('Removing a member unassigns their tickets (PRJ-4, TKT-5)', () => {
  let app: Express;
  let matrix: ProjectAccessMatrix;
  let apiProject: { id: string; key: string };

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
    // A second project where the member is also a member.
    apiProject = await testPrisma.project.create({
      data: {
        key: 'API',
        name: 'API',
        members: {
          create: [
            { userId: matrix.owner.id, role: Role.OWNER },
            { userId: matrix.member.id, role: Role.MEMBER },
          ],
        },
      },
      select: { id: true, key: true },
    });
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const removeMember = (): request.Test =>
    requestAs(
      app,
      matrix,
      'owner',
      'delete',
      `/api/projects/${matrix.project.key}/members/${matrix.member.id}`,
    );
  const assign = async (ticketId: string, userId: string): Promise<void> => {
    await testPrisma.ticket.update({ where: { id: ticketId }, data: { assigneeId: userId } });
  };
  const assigneeOf = async (ticketId: string): Promise<string | null> =>
    (await testPrisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).assigneeId;
  const isMember = async (): Promise<boolean> =>
    (await testPrisma.projectMember.count({
      where: { projectId: matrix.project.id, userId: matrix.member.id },
    })) === 1;

  it('TKT-5: unassigns their tickets in this project only; other tickets stay as they are', async () => {
    const [mine, ownersTicket] = await createTestTickets(matrix.project, matrix.owner.id, [
      'Assigned to the member',
      'Assigned to the owner',
    ]);
    const [elsewhere] = await createTestTickets(apiProject, matrix.owner.id, ['Other project']);
    if (!mine || !ownersTicket || !elsewhere) throw new Error('The test tickets were not created');
    await assign(mine.id, matrix.member.id);
    await assign(ownersTicket.id, matrix.owner.id);
    await assign(elsewhere.id, matrix.member.id);

    const response = await removeMember();

    expect(response.status).toBe(204);
    expect(await isMember()).toBe(false);
    expect(await assigneeOf(mine.id)).toBeNull();
    expect(await assigneeOf(ownersTicket.id)).toBe(matrix.owner.id);
    // Still a member of API, so that ticket keeps its assignee.
    expect(await assigneeOf(elsewhere.id)).toBe(matrix.member.id);
  });

  it('TKT-5, CON-1: the unassigned ticket gets a new updatedAt, so an older edit gets 409', async () => {
    const [loaded] = await createTestTickets(matrix.project, matrix.owner.id, ['Fix login']);
    if (!loaded) throw new Error('The test ticket was not created');
    await assign(loaded.id, matrix.member.id);
    const beforeRemoval = (
      (await requestAs(app, matrix, 'owner', 'get', `/api/projects/WEB/tickets/WEB-1`))
        .body as Ticket
    ).updatedAt;

    await removeMember();

    const response = await requestAs(
      app,
      matrix,
      'owner',
      'patch',
      '/api/projects/WEB/tickets/WEB-1',
    ).send({ updatedAt: beforeRemoval, title: 'Renamed' });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code: ErrorCode.EDIT_CONFLICT, message: EDIT_CONFLICT_MESSAGE },
    });
  });

  it('TKT-5: removal and unassign are one transaction: if the unassign fails, the member stays', async () => {
    const [mine] = await createTestTickets(matrix.project, matrix.owner.id, ['Fix login']);
    if (!mine) throw new Error('The test ticket was not created');
    await assign(mine.id, matrix.member.id);

    await expect(
      createMembersService(prismaWithFailingUnassign()).removeMember(
        matrix.project.id,
        matrix.member.id,
      ),
    ).rejects.toThrow('Unassign failed (test)');

    // The membership delete that ran before the failure was rolled back with it.
    expect(await isMember()).toBe(true);
    expect(await assigneeOf(mine.id)).toBe(matrix.member.id);
  });

  it('TKT-5: an assign racing with the removal never leaves the ticket assigned to a non-member', async () => {
    const [target] = await createTestTickets(matrix.project, matrix.owner.id, ['Fix login']);
    if (!target) throw new Error('The test ticket was not created');

    // 1. Another transaction locks the ticket row, so the assign stops right before its write,
    //    after it has checked (and locked) the membership.
    let release = (): void => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let lockTaken = (): void => undefined;
    const locked = new Promise<void>((resolve) => {
      lockTaken = resolve;
    });
    const holder = testPrisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "Ticket" WHERE "id" = ${target.id}::uuid FOR UPDATE`;
        lockTaken();
        await released;
      },
      { timeout: 15_000 },
    );
    await locked;

    const assignResponse = requestAs(
      app,
      matrix,
      'member',
      'patch',
      '/api/projects/WEB/tickets/WEB-1',
    )
      .send({ updatedAt: target.updatedAt, assigneeId: matrix.member.id })
      .then((response) => response);
    await waitUntil(async () => (await lockWaiters()) >= 1);

    // 2. The removal starts while the assign waits. It must wait for the assign's membership
    //    lock; without that lock it would finish now, before the ticket is assigned.
    let removalDone = false;
    const removalResponse = removeMember().then((response) => {
      removalDone = true;

      return response;
    });
    await waitUntil(async () => removalDone || (await lockWaiters()) >= 2);

    // 3. Let everything finish.
    release();
    await holder;
    const [assigned, removed] = await Promise.all([assignResponse, removalResponse]);

    expect(assigned.status).toBe(200);
    expect(removed.status).toBe(204);
    expect(await isMember()).toBe(false);
    expect(await assigneeOf(target.id)).toBeNull();
  });
});
