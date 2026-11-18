import type { Logger } from 'pino';

const SHUTDOWN_TIMEOUT_MS = 10_000;

interface ClosableServer {
  close(callback: (error?: Error) => void): unknown;
}

type Disconnect = () => Promise<void>;
type Exit = (code: number) => void;

interface ShutdownOptions {
  server: ClosableServer;
  disconnect: Disconnect;
  logger: Logger;
  exit: Exit;
  timeoutMs?: number;
}

async function closeResources(server: ClosableServer, disconnect: Disconnect): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);

        return;
      }
      resolve();
    });
  });

  await disconnect();
}

export function createShutdown({
  server,
  disconnect,
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

    closeResources(server, disconnect).then(
      () => {
        clearTimeout(timeout);
        logger.info('Shutdown complete');
        exit(0);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        logger.error({ err: error }, 'Shutdown failed');
        exit(1);
      },
    );
  };
}

// After an unhandled error the app's state is unknown, so it stops and Docker restarts it.
export function createFatalErrorHandler(logger: Logger, exit: Exit): (error: unknown) => void {
  return (error) => {
    logger.fatal({ err: error }, 'Unhandled error');
    exit(1);
  };
}

export function registerProcessHandlers(
  server: ClosableServer,
  disconnect: Disconnect,
  logger: Logger,
): void {
  const exit: Exit = (code) => process.exit(code);
  const shutdown = createShutdown({ server, disconnect, logger, exit });
  const handleFatalError = createFatalErrorHandler(logger, exit);

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', handleFatalError);
  process.on('uncaughtException', handleFatalError);
}
