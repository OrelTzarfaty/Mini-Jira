import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../src/lib/logger.js';
import { createFatalErrorHandler, createShutdown } from '../../src/lib/shutdown.js';

const logger = createLogger('silent');

type CloseCallback = (error?: Error) => void;

function createFakeServer() {
  let finishClosing: CloseCallback = () => undefined;
  const close = vi.fn((callback: CloseCallback) => {
    finishClosing = callback;
  });

  return { close, finishClosing: (error?: Error) => finishClosing(error) };
}

function createDependencies() {
  return {
    server: createFakeServer(),
    disconnect: vi.fn(() => Promise.resolve()),
    exit: vi.fn(),
    logger,
  };
}

describe('createShutdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('SETUP-3: waits for open requests, then exits with code 0', async () => {
    const dependencies = createDependencies();
    const shutdown = createShutdown(dependencies);

    shutdown('SIGTERM');
    expect(dependencies.server.close).toHaveBeenCalledOnce();
    expect(dependencies.exit).not.toHaveBeenCalled();

    dependencies.server.finishClosing();
    await vi.waitFor(() => {
      expect(dependencies.exit).toHaveBeenCalledExactlyOnceWith(0);
    });
  });

  it('SETUP-4: disconnects the database only after requests finish', async () => {
    const dependencies = createDependencies();

    createShutdown(dependencies)('SIGTERM');
    expect(dependencies.disconnect).not.toHaveBeenCalled();

    dependencies.server.finishClosing();
    await vi.waitFor(() => {
      expect(dependencies.disconnect).toHaveBeenCalledOnce();
    });
  });

  it('SETUP-4: exits with code 1 when the database can not disconnect', async () => {
    const dependencies = createDependencies();
    dependencies.disconnect.mockRejectedValueOnce(new Error('disconnect failed'));

    createShutdown(dependencies)('SIGTERM');
    dependencies.server.finishClosing();

    await vi.waitFor(() => {
      expect(dependencies.exit).toHaveBeenCalledExactlyOnceWith(1);
    });
  });

  it('SETUP-3: ignores a second shutdown signal', () => {
    const dependencies = createDependencies();
    const shutdown = createShutdown(dependencies);

    shutdown('SIGTERM');
    shutdown('SIGINT');

    expect(dependencies.server.close).toHaveBeenCalledOnce();
  });

  it('SETUP-3: exits with code 1 when closing fails', async () => {
    const dependencies = createDependencies();
    createShutdown(dependencies)('SIGTERM');

    dependencies.server.finishClosing(new Error('close failed'));

    await vi.waitFor(() => {
      expect(dependencies.exit).toHaveBeenCalledExactlyOnceWith(1);
    });
  });

  it('SETUP-3: exits with code 1 when requests never finish', () => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    createShutdown({ ...dependencies, timeoutMs: 500 })('SIGTERM');

    vi.advanceTimersByTime(499);
    expect(dependencies.exit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dependencies.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('SETUP-3: does not exit twice after a clean shutdown', async () => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    createShutdown({ ...dependencies, timeoutMs: 500 })('SIGTERM');

    dependencies.server.finishClosing();
    await vi.advanceTimersByTimeAsync(1000);

    expect(dependencies.exit).toHaveBeenCalledExactlyOnceWith(0);
  });
});

describe('createFatalErrorHandler', () => {
  it('SETUP-3: stops the process with code 1', () => {
    const exit = vi.fn();

    createFatalErrorHandler(logger, exit)(new Error('unexpected'));

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});
