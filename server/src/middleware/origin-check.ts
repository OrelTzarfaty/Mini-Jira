import type { RequestHandler } from 'express';

import { ForbiddenError } from '../lib/errors.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// CSRF defense on top of SameSite cookies. Older browsers don't send
// Sec-Fetch-Site, so the Origin header is the fallback.
export function createOriginCheck(clientOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (!STATE_CHANGING_METHODS.has(req.method)) {
      next();
      return;
    }

    const fetchSite = req.get('sec-fetch-site');
    const isSameOrigin = fetchSite
      ? fetchSite === 'same-origin'
      : req.get('origin') === clientOrigin;

    next(isSameOrigin ? undefined : new ForbiddenError('Cross-site requests are not allowed'));
  };
}
