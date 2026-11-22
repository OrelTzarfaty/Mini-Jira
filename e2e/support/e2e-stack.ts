import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The E2E copy of the whole system (docker-compose.e2e.yml). It has its own project name,
// ports, and in-memory database, so resetting it never touches development data.

/** The address of the E2E system's web app (nginx in the client service). */
export const E2E_BASE_URL = 'http://localhost:8180';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Throwaway values for the in-memory E2E database only. They satisfy the ${POSTGRES_*}
// settings in docker-compose.yml, so the run needs no .env file (CI has none).
const E2E_DATABASE = 'minijira_e2e';
const E2E_DATABASE_URL = `postgresql://${E2E_DATABASE}:${E2E_DATABASE}@127.0.0.1:5434/${E2E_DATABASE}`;

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
 * Starts the E2E system from scratch: the old containers and their in-memory data are removed,
 * the images are rebuilt from the current code, and the api applies the migrations on start.
 * "--wait" returns once every service reports healthy.
 */
export function startFreshStack(): void {
  compose('down', '--volumes', '--remove-orphans');
  compose('up', '--build', '--detach', '--wait');
}

/** Adds the demo accounts (server/prisma/seed.ts) to the E2E database. */
export function seedDatabase(): void {
  // npm is a .cmd file on Windows, which Node can start only through a shell (execSync).
  // The command is a fixed string with no outside input, so nothing can be injected into it.
  // DATABASE_URL from this process wins over a developer's .env file.
  execSync('npm run db:seed', {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: 'inherit',
  });
}

/** Stops the E2E system and deletes its containers and data. */
export function stopStack(): void {
  compose('down', '--volumes', '--remove-orphans');
}
