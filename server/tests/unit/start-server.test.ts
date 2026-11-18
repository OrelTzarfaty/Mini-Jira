import { Server } from 'node:net';

import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { startServer } from '../../src/start-server.js';
import type { StartServerOptions, StartupDatabase } from '../../src/start-server.js';
import { createMemoryLogger } from '../helpers/test-app.js';

const FATAL_LOG_LEVEL = 60;

function createDatabase() {
  return {
    $queryRaw: vi.fn<StartupDatabase['$queryRaw']>(() => Promise.resolve([])),
    $disconnect: vi.fn<StartupDatabase['$disconnect']>(() => Promise.resolve()),
  };
}

function createOptions(database: StartupDatabase): StartServerOptions {
  return {
    port: 0,
    clientOrigin: 'http://localhost:5173',
    logger: createMemoryLogger().logger,
    database,
  };
}

// A real exit stops the code right there, so the fake stops it too.
function failOnProcessExit() {
  return vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${String(code)})`);
  });
}

describe('startServer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SETUP-4: runs a real query before it accepts requests', async () => {
    vi.spyOn(process, 'on').mockReturnValue(process);
    const listen = vi.spyOn(Server.prototype, 'listen');
    const database = createDatabase();
    let finishQuery: (rows: unknown) => void = () => undefined;
    database.$queryRaw.mockReturnValueOnce(
      new Promise((resolve) => {
        finishQuery = resolve;
      }),
    );

    const starting = startServer(createOptions(database));
    await vi.waitFor(() => {
      expect(database.$queryRaw).toHaveBeenCalledOnce();
    });
    expect(listen).not.toHaveBeenCalled();

    finishQuery([]);
    const server = await starting;

    expect(listen).toHaveBeenCalledOnce();
    expect(database.$queryRaw.mock.calls[0]?.[0].join('')).toBe('SELECT 1');
    await request(server).get('/api/health').expect(200);
    await new Promise((resolve) => server.close(resolve));
  });

  it('SETUP-4: logs the failure and exits with code 1 when the database check fails', async () => {
    const exit = failOnProcessExit();
    const listen = vi.spyOn(Server.prototype, 'listen');
    const database = createDatabase();
    database.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const { logger, lines } = createMemoryLogger();

    await expect(startServer({ ...createOptions(database), logger })).rejects.toThrow(
      'process.exit(1)',
    );

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(listen).not.toHaveBeenCalled();
    expect(lines).toContainEqual(
      expect.objectContaining({
        level: FATAL_LOG_LEVEL,
        msg: 'The API could not connect to the database',
      }),
    );
  });

  it('SETUP-4: disconnects the database when the API shuts down', async () => {
    const processOn = vi.spyOn(process, 'on').mockReturnValue(process);
    const exit = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const database = createDatabase();
    const server = await startServer(createOptions(database));
    const shutdown = processOn.mock.calls.find(([event]) => event === 'SIGTERM')?.[1];

    shutdown?.('SIGTERM');

    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    });
    expect(database.$disconnect).toHaveBeenCalledOnce();
    expect(server.listening).toBe(false);
  });
});
