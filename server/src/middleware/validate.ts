import type { ErrorDetail } from '@mini-jira/shared';
import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { ValidationError } from '../lib/errors.js';

const INVALID_BODY_MESSAGE = 'The request body is invalid';

// One detail per field, so the client can show each message next to its input. An unknown key
// is reported under its own name; a problem with the whole body (not a JSON object) has no
// field, so it gets only the general message.
function toErrorDetails(issue: z.core.$ZodIssue): ErrorDetail[] {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => ({
      field: [...issue.path, key].join('.'),
      message: 'Unknown field',
    }));
  }

  return issue.path.length > 0 ? [{ field: issue.path.join('.'), message: issue.message }] : [];
}

/**
 * Validates `req.body` with a zod schema and replaces it with the parsed value (trimmed,
 * lowercased, unknown fields rejected), so handlers only ever see clean input.
 * Invalid input → 400 VALIDATION_ERROR with `details[]`.
 */
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.flatMap(toErrorDetails);
      // The first field message leads, like "Email is required".
      const message = details[0]?.message ?? INVALID_BODY_MESSAGE;
      next(new ValidationError(message, details.length > 0 ? details : undefined));

      return;
    }

    req.body = result.data;
    next();
  };
}

const INVALID_QUERY_MESSAGE = 'The query string is invalid';

/**
 * Parses `req.query` with a strict zod schema (unknown parameters rejected) and returns the typed
 * result (numbers converted, defaults filled in). A function the handler calls, not a middleware:
 * Express 5 makes `req.query` read-only, and returning the parsed value keeps its zod type
 * without an `as` cast (standards §5). Invalid input → throws 400 VALIDATION_ERROR with `details[]`.
 */
export function parseQuery<S extends z.ZodType>(schema: S, query: unknown): z.output<S> {
  const result = schema.safeParse(query);

  if (!result.success) {
    const details = result.error.issues.flatMap(toErrorDetails);
    throw new ValidationError(
      details[0]?.message ?? INVALID_QUERY_MESSAGE,
      details.length > 0 ? details : undefined,
    );
  }

  return result.data;
}
