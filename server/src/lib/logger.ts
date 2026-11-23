import { pino } from 'pino';
import type { DestinationStream, Logger, LoggerOptions } from 'pino';

const options = (level: string): LoggerOptions => ({
  level,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.email',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[redacted]',
  },
});

export function createLogger(level: string, destination?: DestinationStream): Logger {
  return destination ? pino(options(level), destination) : pino(options(level));
}
