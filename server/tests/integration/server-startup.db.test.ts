import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import type { Server, Socket } from 'node:net';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const SERVER_DIR = fileURLToPath(new URL('../..', import.meta.url));
const DATABASE_PASSWORD = 'startup-test-password';
// Long enough for the connection timeout plus the time the process needs to boot.
const EXIT_LIMIT_MS = 30_000;
const TEST_TIMEOUT_MS = EXIT_LIMIT_MS + 5_000;

interface ServerRun {
  exitCode: number | null;
  output: string;
  didTimeOut: boolean;
}

async function listenOnFreePort(server: Server): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();

  if (address === null || typeof address === 'string') {
    throw new Error('The test server has no TCP port');
  }

  return address.port;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

async function findFreePort(): Promise<number> {
  const server = createServer();
  const port = await listenOnFreePort(server);
  await closeServer(server);

  return port;
}

function databaseUrlForPort(port: number): string {
  return `postgresql://startup_user:${DATABASE_PASSWORD}@127.0.0.1:${String(port)}/startup_db`;
}

// Runs the real entry point, because the startup behavior depends on the whole process.
async function runServerUntilExit(databaseUrl: string): Promise<ServerRun> {
  const apiPort = await findFreePort();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(apiPort),
        LOG_LEVEL: 'info',
        CLIENT_ORIGIN: 'http://localhost:5173',
        DATABASE_URL: databaseUrl,
      },
    });
    let output = '';
    let didTimeOut = false;

    const limit = setTimeout(() => {
      didTimeOut = true;
      child.kill();
    }, EXIT_LIMIT_MS);

    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', reject);
    child.on('close', (exitCode) => {
      clearTimeout(limit);
      resolve({ exitCode, output, didTimeOut });
    });
  });
}

describe('API startup', () => {
  const openSockets = new Set<Socket>();
  let silentDatabase: Server | undefined;

  afterEach(async () => {
    openSockets.forEach((socket) => socket.destroy());
    openSockets.clear();

    if (silentDatabase) {
      await closeServer(silentDatabase);
      silentDatabase = undefined;
    }
  });

  // Accepts connections and never sends a byte, like a frozen database or a broken proxy.
  async function startSilentDatabase(): Promise<number> {
    silentDatabase = createServer((socket) => {
      socket.on('error', () => undefined);
      openSockets.add(socket);
    });

    return listenOnFreePort(silentDatabase);
  }

  it(
    'SETUP-4: exits with code 1 and a clear error when the database never answers',
    async () => {
      const port = await startSilentDatabase();

      const run = await runServerUntilExit(databaseUrlForPort(port));

      expect(run.didTimeOut).toBe(false);
      expect(run.exitCode).toBe(1);
      expect(run.output).toContain('The API could not connect to the database');
    },
    TEST_TIMEOUT_MS,
  );
});
