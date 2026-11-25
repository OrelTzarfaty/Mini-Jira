import type { ErrorDetail } from '@mini-jira/shared';
import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { ValidationError } from '../lib/errors.js';

const INVALID_BODY_MESSAGE = 'The request body is invalid';
const INVALID_QUERY_MESSAGE = 'The query string is invalid';
const INVALID_PARAMS_MESSAGE = 'The path parameters are invalid';

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

type ParseResult<Data> = { success: true; data: Data } | { success: false; error: ValidationError };

function parseInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  fallbackMessage: string,
): ParseResult<z.output<Schema>> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.issues.flatMap(toErrorDetails);
  // The first field message leads, like "Email is required". Without one, a rule we wrote for
  // the whole body (a custom refine, e.g. PRJ-5 "Change the name or the description") gives
  // the message; zod's own whole-body messages ("expected object") stay hidden behind the
  // general one.
  const bodyRuleMessage = result.error.issues.find(
    (issue) => issue.code === 'custom' && issue.path.length === 0,
  )?.message;
  const message = details[0]?.message ?? bodyRuleMessage ?? fallbackMessage;

  return {
    success: false,
    error: new ValidationError(message, details.length > 0 ? details : undefined),
  };
}

/**
 * Validates `req.body` with a zod schema and replaces it with the parsed value (trimmed,
 * lowercased, unknown fields rejected), so handlers only ever see clean input.
 * Invalid input → 400 VALIDATION_ERROR with `details[]`.
 */
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = parseInput(schema, req.body, INVALID_BODY_MESSAGE);

    if (!result.success) {
      next(result.error);

      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * LST-4: parses `req.query` with a zod schema (e.g. `paginationQuerySchema`) and returns the typed
 * value (`?page=2` becomes `{ page: 2 }`, a missing page becomes 1, unknown parameters are
 * rejected). Invalid input throws 400 VALIDATION_ERROR with `details[]`.
 *
 * A function the controller calls, not a middleware like validateBody: Express 5 makes
 * `req.query` a read-only getter typed as strings, so a parsed `{ page: number }` can't be put
 * back on the request with its type. Routes still run requireAuth and loadProjectAccess first,
 * so an outsider never learns the query rules.
 */
export function parseQuery<Schema extends z.ZodType>(
  schema: Schema,
  query: unknown,
): z.output<Schema> {
  return parseOrThrow(schema, query, INVALID_QUERY_MESSAGE);
}

/**
 * PRJ-4: parses `req.params` with a zod schema (e.g. `memberParamsSchema`) and returns the typed
 * value. A function the controller calls, like parseQuery, so it runs after the access checks
 * and only a caller who may use the route learns its rules. Invalid input throws 400
 * VALIDATION_ERROR with `details[]` on the parameter.
 */
export function parseParams<Schema extends z.ZodType>(
  schema: Schema,
  params: unknown,
): z.output<Schema> {
  return parseOrThrow(schema, params, INVALID_PARAMS_MESSAGE);
}

function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  fallbackMessage: string,
): z.output<Schema> {
  const result = parseInput(schema, input, fallbackMessage);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
