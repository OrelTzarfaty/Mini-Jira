import type { APIRequestContext } from '@playwright/test';

import { newApiContext } from './auth-api.js';
import type { StorageState } from './auth-api.js';

// Creates test tickets straight through the API, so a spec only drives the UI it tests (and a
// board test doesn't fill the form 50 times).

export interface TicketInput {
  title: string;
  description?: string;
  type?: 'TASK' | 'BUG' | 'STORY';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
}

/** Sends `POST /api/projects/:projectKey/tickets` (TKT-1) and returns the new ticket's key. */
async function postTicket(
  api: APIRequestContext,
  projectKey: string,
  ticket: TicketInput,
): Promise<string> {
  const response = await api.post(`/api/projects/${projectKey}/tickets`, { data: ticket });
  if (response.status() !== 201) {
    throw new Error(
      `POST /api/projects/${projectKey}/tickets "${ticket.title}" failed: ${String(response.status())} ${await response.text()}`,
    );
  }
  const created = (await response.json()) as { key: string };

  return created.key;
}

/**
 * Creates a ticket as the session's user, who becomes its reporter (TKT-1). Returns the key the
 * server picked, such as WEB-1.
 */
export async function createTicketThroughApi(
  session: StorageState,
  projectKey: string,
  ticket: TicketInput,
): Promise<string> {
  const api = await newApiContext(session);
  try {
    return await postTicket(api, projectKey, ticket);
  } finally {
    await api.dispose();
  }
}

/**
 * Creates tickets as the session's user, one after another and titled in order. A new ticket
 * goes to the bottom of To Do, so creating them one at a time makes the rank order the same as
 * the creation order (KEY-1, KEY-2, ...).
 */
export async function createTicketsThroughApi(
  session: StorageState,
  projectKey: string,
  titles: readonly string[],
): Promise<void> {
  const api = await newApiContext(session);
  try {
    for (const title of titles) {
      await postTicket(api, projectKey, { title });
    }
  } finally {
    await api.dispose();
  }
}
