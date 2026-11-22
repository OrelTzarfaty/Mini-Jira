import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The E2E copy of the whole system (docker-compose.e2e.yml). It has its own project name,
// ports, and in-memory database, so resetting it never touches development data.

/** The address of the E2E system's web app (nginx in the client service). */
export const E2E_BASE_URL = 'http://localhost:8180';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Throwaway values for the in-memory E2E database only. They satisfy the ${POSTGRES_*}
// settings in docker-compose.yml, so the run needs no .env file (CI has none).
const E2E_DATABASE = 'minijira_e2e';

const COMPOSE_ARGS = [
  'compose',
  '--project-name',
  'minijira-e2e',
  '--file',
  'docker-compose.yml',
  '--file',
  'docker-compose.e2e.yml',
];

const stackEnv: NodeJS.ProcessEnv = {
  ...process.env,
  POSTGRES_USER: E2E_DATABASE,
  POSTGRES_PASSWORD: E2E_DATABASE,
  POSTGRES_DB: E2E_DATABASE,
};

function compose(...args: string[]): void {
  execFileSync('docker', [...COMPOSE_ARGS, ...args], {
    cwd: REPO_ROOT,
    env: stackEnv,
    stdio: 'inherit',
  });
}

/**
 * Builds the images from the current code and starts the E2E system; the api applies the
 * migrations on start. "--wait" returns once every service reports healthy.
 */
export function startStack(): void {
  compose('up', '--build', '--detach', '--wait');
}

/** Stops the E2E system and deletes its containers and data. */
export function stopStack(): void {
  compose('down', '--volumes', '--remove-orphans');
}
