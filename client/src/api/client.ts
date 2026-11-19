import { errorResponseSchema } from '@mini-jira/shared';
import type { z } from 'zod';

import { ApiError, ClientErrorCode, NO_RESPONSE_STATUS } from './api-error';

const API_BASE_PATH = '/api';
const HTTP_NO_CONTENT = 204;

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";
const UNEXPECTED_RESPONSE_MESSAGE = 'Something went wrong. Please try again.';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ApiRequestOptions<T> {
  /** Checks the response body and gives it its type. Use z.undefined() for 204 No Content. */
  schema: z.ZodType<T>;
  method?: HttpMethod;
  /** Sent as JSON. */
  body?: unknown;
  /** Lets TanStack Query cancel a request that is no longer needed. */
  signal?: AbortSignal;
}

/**
 * The one way the app calls the API (docs/architecture.md §5.1). It sends the HTTP-only
 * auth cookie, checks the response with a zod schema, and turns every failure into an
 * ApiError, whether the API answered with its error format or never answered at all.
 */
export async function apiRequest<T>(
  path: string,
  { schema, method = 'GET', body, signal }: ApiRequestOptions<T>,
): Promise<T> {
  const response = await send(path, { method, body, signal });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const data = response.status === HTTP_NO_CONTENT ? undefined : await readJson(response);
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw unexpectedResponseError(response);
  }

  return parsed.data;
}

async function send(
  path: string,
  { method, body, signal }: { method: HttpMethod; body: unknown; signal?: AbortSignal },
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    return await fetch(`${API_BASE_PATH}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      // Sends the auth cookie. JavaScript never reads the token itself (architecture §7).
      credentials: 'include',
    });
  } catch (error) {
    // A cancelled request isn't a failure; TanStack Query expects the original error.
    if (signal?.aborted) {
      throw error;
    }

    throw new ApiError({
      status: NO_RESPONSE_STATUS,
      code: ClientErrorCode.NETWORK_ERROR,
      message: NETWORK_ERROR_MESSAGE,
    });
  }
}

/** The body as JSON, or undefined when it isn't JSON (for example an HTML error page). */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = errorResponseSchema.safeParse(await readJson(response));

  if (!parsed.success) {
    return unexpectedResponseError(response);
  }

  const { code, message, details } = parsed.data.error;

  return new ApiError({ status: response.status, code, message, details });
}

function unexpectedResponseError(response: Response): ApiError {
  return new ApiError({
    status: response.status,
    code: ClientErrorCode.UNEXPECTED_RESPONSE,
    message: UNEXPECTED_RESPONSE_MESSAGE,
  });
}
