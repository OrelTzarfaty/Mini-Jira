import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { HttpLogger } from 'pino-http';

import { assignRequestId } from './request-id.js';

interface LoggedRequest {
  id: string;
  method: string;
  url: string;
}

interface LoggedResponse {
  statusCode: number;
}

export function createHttpLogger(logger: Logger): HttpLogger {
  return pinoHttp({
    logger,
    genReqId: assignRequestId,
    // Log only these fields, so cookies and other headers never reach the logs.
    serializers: {
      req: ({ id, method, url }: LoggedRequest) => ({ id, method, url }),
      res: ({ statusCode }: LoggedResponse) => ({ statusCode }),
    },
  });
}
