import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Only simple IDs are reused, so a client can't inject text into the logs.
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

export function assignRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

  res.setHeader('X-Request-Id', id);
  return id;
}
