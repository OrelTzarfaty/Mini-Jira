import { Priority } from '@mini-jira/shared';
import type { UpdateTicketInput } from '@mini-jira/shared';
import { describe, expect, it } from 'vitest';

import { ticketChanges } from '@/features/tickets/lib/ticket-changes';
import { TEST_TICKET } from '@/test/tickets';

/** The form's output for the ticket as loaded, with nothing changed. */
const UNCHANGED: UpdateTicketInput = {
  updatedAt: TEST_TICKET.updatedAt,
  title: TEST_TICKET.title,
  description: TEST_TICKET.description,
  type: TEST_TICKET.type,
  priority: TEST_TICKET.priority,
  status: TEST_TICKET.status,
  dueDate: TEST_TICKET.dueDate,
  assigneeId: TEST_TICKET.assignee?.id ?? null,
};

describe('ticketChanges (TKT-3)', () => {
  it('TKT-3: nothing changed gives null, so no request is sent', () => {
    expect(ticketChanges(TEST_TICKET, UNCHANGED)).toBeNull();
  });

  it('TKT-3: keeps only the changed fields, with the loaded updatedAt', () => {
    expect(
      ticketChanges(TEST_TICKET, { ...UNCHANGED, priority: Priority.LOW, updatedAt: 'ignored' }),
    ).toEqual({ updatedAt: TEST_TICKET.updatedAt, priority: Priority.LOW });
  });

  it('TKT-3: a cleared description and due date are sent as null', () => {
    expect(ticketChanges(TEST_TICKET, { ...UNCHANGED, description: null, dueDate: null })).toEqual({
      updatedAt: TEST_TICKET.updatedAt,
      description: null,
      dueDate: null,
    });
  });

  it('TKT-3: an empty description that was already empty is no change', () => {
    expect(
      ticketChanges({ ...TEST_TICKET, description: null }, { ...UNCHANGED, description: null }),
    ).toBeNull();
  });

  it('TKT-5: the same assignee is no change; another one or none is sent as assigneeId', () => {
    const otherUserId = '7a2d3b4f-5c6e-4f70-9bac-1d2e3f4a5b6c';

    expect(ticketChanges(TEST_TICKET, { ...UNCHANGED, assigneeId: otherUserId })).toEqual({
      updatedAt: TEST_TICKET.updatedAt,
      assigneeId: otherUserId,
    });
    expect(ticketChanges(TEST_TICKET, { ...UNCHANGED, assigneeId: null })).toEqual({
      updatedAt: TEST_TICKET.updatedAt,
      assigneeId: null,
    });
    expect(
      ticketChanges({ ...TEST_TICKET, assignee: null }, { ...UNCHANGED, assigneeId: null }),
    ).toBeNull();
  });
});
