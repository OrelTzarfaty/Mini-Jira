import { randomInt } from 'node:crypto';

import { newApiContext } from './auth-api.js';
import type { StorageState } from './auth-api.js';

// Creates test data straight through the API, so a spec only drives the UI it tests.

export interface CreatedProject {
  key: string;
  name: string;
}

const KEY_LENGTH = 6;
const LETTER_COUNT = 26;
const FIRST_LETTER = 'A'.charCodeAt(0);

/** A random 6-letter key, so parallel tests (and reruns) never ask for the same one. */
function randomProjectKey(): string {
  return Array.from({ length: KEY_LENGTH }, () =>
    String.fromCharCode(FIRST_LETTER + randomInt(LETTER_COUNT)),
  ).join('');
}

/** Creates a project with `POST /api/projects` as the session's user, who becomes its owner (PRJ-1). */
export async function createProjectThroughApi(session: StorageState): Promise<CreatedProject> {
  const key = randomProjectKey();
  const project = { key, name: `E2E project ${key}` };
  const api = await newApiContext(session);
  try {
    const response = await api.post('/api/projects', { data: project });
    if (response.status() !== 201) {
      throw new Error(
        `POST /api/projects ${key} failed: ${String(response.status())} ${await response.text()}`,
      );
    }

    return project;
  } finally {
    await api.dispose();
  }
}
