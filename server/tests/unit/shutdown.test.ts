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

describe('createShutdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('SETUP-3: waits for open requests, then exits with code 0', () => {
    const server = createFakeServer();
    const exit = vi.fn();
    const shutdown = createShutdown({ server, logger, exit });

    shutdown('SIGTERM');
    expect(server.close).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();

    server.finishClosing();
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('SETUP-3: ignores a second shutdown signal', () => {
    const server = createFakeServer();
    const shutdown = createShutdown({ server, logger, exit: vi.fn() });

    shutdown('SIGTERM');
    shutdown('SIGINT');

    expect(server.close).toHaveBeenCalledOnce();
  });

  it('SETUP-3: exits with code 1 when closing fails', () => {
    const server = createFakeServer();
    const exit = vi.fn();
    createShutdown({ server, logger, exit })('SIGTERM');

    server.finishClosing(new Error('close failed'));

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('SETUP-3: exits with code 1 when requests never finish', () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    createShutdown({ server: createFakeServer(), logger, exit, timeoutMs: 500 })('SIGTERM');

    vi.advanceTimersByTime(499);
    expect(exit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('SETUP-3: does not exit twice after a clean shutdown', () => {
    vi.useFakeTimers();
    const server = createFakeServer();
    const exit = vi.fn();
    createShutdown({ server, logger, exit, timeoutMs: 500 })('SIGTERM');

    server.finishClosing();
    vi.advanceTimersByTime(1000);

    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });
});

describe('createFatalErrorHandler', () => {
  it('SETUP-3: stops the process with code 1', () => {
    const exit = vi.fn();

    createFatalErrorHandler(logger, exit)(new Error('unexpected'));

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});
