import { newApiContext } from './auth-api.js';
import type { StorageState } from './auth-api.js';

// Creates test tickets straight through the API, so a spec only drives the UI it tests.

export interface TicketInput {
  title: string;
  description?: string;
  type?: 'TASK' | 'BUG' | 'STORY';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
}

/**
 * Creates a ticket with `POST /api/projects/:projectKey/tickets` as the session's user, who
 * becomes its reporter (TKT-1). Returns the key the server picked, such as WEB-1.
 */
export async function createTicketThroughApi(
  session: StorageState,
  projectKey: string,
  ticket: TicketInput,
): Promise<string> {
  const api = await newApiContext(session);
  try {
    const response = await api.post(`/api/projects/${projectKey}/tickets`, { data: ticket });
    if (response.status() !== 201) {
      throw new Error(
        `POST /api/projects/${projectKey}/tickets failed: ${String(response.status())} ${await response.text()}`,
      );
    }
    const created = (await response.json()) as { key: string };

    return created.key;
  } finally {
    await api.dispose();
  }
}
