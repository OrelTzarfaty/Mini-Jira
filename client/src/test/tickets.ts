import {
  ErrorCode,
  Priority,
  Status,
  TICKET_NOT_FOUND_MESSAGE,
  TicketType,
  updateTicketSchema,
} from '@mini-jira/shared';
import type { ErrorResponse, Ticket } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { TEST_PROJECT } from './project';
import { server } from './server';
import { TEST_USER } from './session';

const TICKET_URL = '/api/projects/:projectKey/tickets/:ticketKey';

/** The ticket that ticket-page tests open (wireframe 04 uses WEB-12). */
export const TEST_TICKET: Ticket = {
  id: '9d2e3f4a-5b6c-4d7e-8f90-a1b2c3d4e5f6',
  key: `${TEST_PROJECT.key}-12`,
  number: 12,
  title: 'Fix login redirect after the session expires',
  description: 'When the session expires, the user lands on an empty page.\n\nSteps:\n1. Log in',
  type: TicketType.BUG,
  priority: Priority.HIGH,
  status: Status.IN_PROGRESS,
  reporter: { id: '7a2d3b4f-5c6e-4f70-9bac-1d2e3f4a5b6c', name: 'Avi Ben' },
  assignee: { id: TEST_USER.id, name: TEST_USER.name },
  dueDate: '2026-11-30',
  createdAt: '2026-11-10T09:00:00.000Z',
  updatedAt: '2026-11-25T14:30:00.000Z',
};

/**
 * Makes GET /api/projects/:projectKey/tickets/:ticketKey answer with the ticket (TKT-2).
 * Returns the paths it was asked for, so a test can check the keys it sent.
 */
export function mockTicket(ticket: Ticket = TEST_TICKET): string[] {
  const requestedPaths: string[] = [];

  server.use(
    http.get(TICKET_URL, ({ request }) => {
      requestedPaths.push(new URL(request.url).pathname);

      return HttpResponse.json(ticket);
    }),
  );

  return requestedPaths;
}

/** Makes the ticket request answer 404, as the API does for a key that isn't in the project. */
export function mockTicketNotFound(): void {
  server.use(
    http.get(TICKET_URL, () =>
      HttpResponse.json(
        { error: { code: ErrorCode.NOT_FOUND, message: TICKET_NOT_FOUND_MESSAGE } },
        { status: 404 },
      ),
    ),
  );
}

/** Makes the ticket request fail with a server error the first time, then answer normally. */
export function mockTicketErrorOnce(ticket: Ticket = TEST_TICKET): { requests: () => number } {
  let requests = 0;

  server.use(
    http.get(TICKET_URL, () => {
      requests += 1;

      return requests === 1
        ? HttpResponse.json(
            { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
            { status: 500 },
          )
        : HttpResponse.json(ticket);
    }),
  );

  return { requests: () => requests };
}

/** Holds the ticket request until the test calls answer(), to see the loading state. */
export function mockTicketOnHold(ticket: Ticket = TEST_TICKET): { answer: () => void } {
  const { promise, resolve } = Promise.withResolvers<undefined>();

  server.use(
    http.get(TICKET_URL, async () => {
      await promise;

      return HttpResponse.json(ticket);
    }),
  );

  return {
    answer: () => {
      resolve(undefined);
    },
  };
}

/** The updatedAt the PATCH mock gives a saved ticket. */
export const SAVED_UPDATED_AT = '2026-11-26T10:00:00.000Z';

interface MockUpdateTicketOptions {
  /** Answer with this error instead of saving. */
  error?: { status: number; body: ErrorResponse };
  /** Hold the answer until the test calls answer(), to see the saving state. */
  hold?: boolean;
}

/**
 * Makes PATCH /api/projects/:projectKey/tickets/:ticketKey (TKT-3) save the sent fields into the
 * ticket, with a new updatedAt, and the GET answer with the saved ticket from then on. Returns
 * the bodies it was sent.
 */
export function mockUpdateTicket(
  ticket: Ticket = TEST_TICKET,
  { error, hold = false }: MockUpdateTicketOptions = {},
): { bodies: unknown[]; answer: () => void } {
  const bodies: unknown[] = [];
  const { promise, resolve } = Promise.withResolvers<undefined>();
  let current = ticket;

  if (!hold) {
    resolve(undefined);
  }

  server.use(
    http.get(TICKET_URL, () => HttpResponse.json(current)),
    http.patch(TICKET_URL, async ({ request }) => {
      const body: unknown = await request.json();
      bodies.push(body);
      await promise;

      if (error) {
        return HttpResponse.json(error.body, { status: error.status });
      }

      // Saved the way the server saves it: the sent fields change, a new updatedAt.
      current = { ...current, ...updateTicketSchema.parse(body), updatedAt: SAVED_UPDATED_AT };

      return HttpResponse.json(current);
    }),
  );

  return {
    bodies,
    answer: () => {
      resolve(undefined);
    },
  };
}
