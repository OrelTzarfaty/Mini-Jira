import { newApiContext } from './auth-api.js';
import type { StorageState } from './auth-api.js';

// Creates tickets straight through the API, so a board test doesn't fill the form 50 times.

/**
 * Creates tickets with `POST /api/projects/:projectKey/tickets` as the session's user (TKT-1),
 * one after another and titled in order. A new ticket goes to the bottom of To Do, so creating
 * them one at a time makes the rank order the same as the creation order (KEY-1, KEY-2, ...).
 */
export async function createTicketsThroughApi(
  session: StorageState,
  projectKey: string,
  titles: readonly string[],
): Promise<void> {
  const api = await newApiContext(session);
  try {
    for (const title of titles) {
      const response = await api.post(`/api/projects/${projectKey}/tickets`, { data: { title } });
      if (response.status() !== 201) {
        throw new Error(
          `POST /api/projects/${projectKey}/tickets "${title}" failed: ${String(response.status())} ${await response.text()}`,
        );
      }
    }
  } finally {
    await api.dispose();
  }
}
