import type { Logger } from 'pino';

const SHUTDOWN_TIMEOUT_MS = 10_000;

interface ClosableServer {
  close(callback: (error?: Error) => void): unknown;
}

type Exit = (code: number) => void;

interface ShutdownOptions {
  server: ClosableServer;
  logger: Logger;
  exit: Exit;
  timeoutMs?: number;
}

export function createShutdown({
  server,
  logger,
  exit,
  timeoutMs = SHUTDOWN_TIMEOUT_MS,
}: ShutdownOptions): (signal: string) => void {
  let isShuttingDown = false;

  return (signal) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const timeout = setTimeout(() => {
      logger.error('Shutdown timed out');
      exit(1);
    }, timeoutMs);

    server.close((error) => {
      clearTimeout(timeout);
      if (error) {
        logger.error({ err: error }, 'Shutdown failed');
        exit(1);
        return;
      }
      logger.info('Shutdown complete');
      exit(0);
    });
  };
}

// After an unhandled error the app's state is unknown, so it stops and Docker restarts it.
export function createFatalErrorHandler(logger: Logger, exit: Exit): (error: unknown) => void {
  return (error) => {
    logger.fatal({ err: error }, 'Unhandled error');
    exit(1);
  };
}

export function registerProcessHandlers(server: ClosableServer, logger: Logger): void {
  const exit: Exit = (code) => process.exit(code);
  const shutdown = createShutdown({ server, logger, exit });
  const handleFatalError = createFatalErrorHandler(logger, exit);

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', handleFatalError);
  process.on('uncaughtException', handleFatalError);
}
