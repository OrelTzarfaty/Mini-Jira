import { describe, expect, it } from 'vitest';

import {
  createTicketSchema,
  DUE_DATE_FORMAT_MESSAGE,
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  ticketSchema,
} from './tickets.js';

/** The messages zod reports for a field, so tests check the exact text the user sees. */
const messagesFor = (input: unknown, field: string): string[] => {
  const result = createTicketSchema.safeParse(input);
  if (result.success) return [];

  return result.error.issues
    .filter((issue) => issue.path[0] === field || issue.code === 'unrecognized_keys')
    .map((issue) => issue.message);
};

describe('createTicketSchema', () => {
  it('TKT-1: a title alone gets the defaults: TASK, MEDIUM, no description, no due date', () => {
    expect(createTicketSchema.parse({ title: 'Fix login' })).toEqual({
      title: 'Fix login',
      description: null,
      type: 'TASK',
      priority: 'MEDIUM',
      dueDate: null,
    });
  });

  it('TKT-1: accepts every field and trims the text', () => {
    expect(
      createTicketSchema.parse({
        title: '  Fix login  ',
        description: '  Steps:\n1. Open the page  ',
        type: 'BUG',
        priority: 'CRITICAL',
        dueDate: '2026-12-01',
      }),
    ).toEqual({
      title: 'Fix login',
      description: 'Steps:\n1. Open the page',
      type: 'BUG',
      priority: 'CRITICAL',
      dueDate: '2026-12-01',
    });
  });

  it.each([
    ['missing', {}],
    ['empty', { title: '' }],
    ['only spaces', { title: '   ' }],
  ])('TKT-1: a %s title is required', (_case, input) => {
    expect(messagesFor(input, 'title')).toEqual(['Title is required']);
  });

  it('TKT-1: limits the title to 120 characters', () => {
    const atLimit = 'a'.repeat(TICKET_TITLE_MAX_LENGTH);
    expect(createTicketSchema.parse({ title: atLimit }).title).toBe(atLimit);
    expect(messagesFor({ title: `${atLimit}a` }, 'title')).toEqual([
      'Title must be at most 120 characters',
    ]);
  });

  it('TKT-1: rejects control characters in the title', () => {
    expect(messagesFor({ title: 'bad\u0000title' }, 'title')).toEqual([
      "Title contains characters that aren't allowed",
    ]);
  });

  it('TKT-1: stores a null or blank description as null and keeps line breaks', () => {
    expect(createTicketSchema.parse({ title: 'T', description: null }).description).toBeNull();
    expect(createTicketSchema.parse({ title: 'T', description: ' \n ' }).description).toBeNull();
    expect(createTicketSchema.parse({ title: 'T', description: 'a\r\n\tb' }).description).toBe(
      'a\r\n\tb',
    );
  });

  it('TKT-1: limits the description length and rejects other control characters', () => {
    const atLimit = 'a'.repeat(TICKET_DESCRIPTION_MAX_LENGTH);
    expect(createTicketSchema.parse({ title: 'T', description: atLimit }).description).toBe(
      atLimit,
    );
    expect(messagesFor({ title: 'T', description: `${atLimit}a` }, 'description')).toEqual([
      'Description must be at most 10000 characters',
    ]);
    expect(messagesFor({ title: 'T', description: 'bad\u0000text' }, 'description')).toEqual([
      "Description contains characters that aren't allowed",
    ]);
  });

  it('TKT-1: rejects an unknown type or priority', () => {
    expect(messagesFor({ title: 'T', type: 'EPIC' }, 'type')).toEqual([
      'Type must be TASK, BUG or STORY',
    ]);
    expect(messagesFor({ title: 'T', priority: 'urgent' }, 'priority')).toEqual([
      'Priority must be LOW, MEDIUM, HIGH or CRITICAL',
    ]);
  });

  it('TKT-1: accepts a null due date and real calendar days', () => {
    expect(createTicketSchema.parse({ title: 'T', dueDate: null }).dueDate).toBeNull();
    expect(createTicketSchema.parse({ title: 'T', dueDate: '2028-02-29' }).dueDate).toBe(
      '2028-02-29',
    );
  });

  it.each([
    '2026-02-30',
    '2027-02-29',
    '2026-13-01',
    '2026-1-5',
    '01/12/2026',
    '2026-12-01T10:00:00Z',
    '0000-01-01',
    '',
  ])('TKT-1: rejects the due date %j', (dueDate) => {
    expect(messagesFor({ title: 'T', dueDate }, 'dueDate')).toEqual([DUE_DATE_FORMAT_MESSAGE]);
  });

  it.each(['status', 'number', 'rank', 'assigneeId', 'reporterId', 'projectId'])(
    'TKT-1: rejects the server-owned field %s',
    (field) => {
      const result = createTicketSchema.safeParse({ title: 'T', [field]: 'x' });

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ code: 'unrecognized_keys', keys: [field] }),
      ]);
    },
  );
});

describe('ticketSchema', () => {
  it('TKT-1: drops internal fields such as the rank and ids', () => {
    const ticket = {
      id: '6f1c1f0e-3c4b-4a8e-9d4c-2f1b5e7a9c10',
      key: 'WEB-1',
      number: 1,
      title: 'Fix login',
      description: null,
      type: 'TASK',
      priority: 'MEDIUM',
      status: 'TODO',
      reporter: { id: '6f1c1f0e-3c4b-4a8e-9d4c-2f1b5e7a9c11', name: 'Dana' },
      assignee: null,
      dueDate: null,
      createdAt: '2026-11-25T10:00:00.000Z',
      updatedAt: '2026-11-25T10:00:00.000Z',
    };

    expect(ticketSchema.parse({ ...ticket, rank: 'a0', projectId: 'p', reporterId: 'r' })).toEqual(
      ticket,
    );
  });
});
