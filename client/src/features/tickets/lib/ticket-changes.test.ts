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
});
