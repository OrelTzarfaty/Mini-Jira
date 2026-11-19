import type { ErrorCode, ErrorDetail } from '@mini-jira/shared';

/** Problems the client finds itself. The API's own codes are ErrorCode in @mini-jira/shared. */
export const ClientErrorCode = {
  /** No response at all: the user is offline, or the server is down. */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** A response that isn't the agreed JSON, such as an HTML error page from a proxy. */
  UNEXPECTED_RESPONSE: 'UNEXPECTED_RESPONSE',
} as const;
export type ClientErrorCode = (typeof ClientErrorCode)[keyof typeof ClientErrorCode];

/** The status of an ApiError when the server never answered. */
export const NO_RESPONSE_STATUS = 0;

interface ApiErrorInit {
  status: number;
  code: ErrorCode | ClientErrorCode;
  message: string;
  details?: readonly ErrorDetail[];
}

/** Every failed API call throws this, so the UI handles one error shape. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | ClientErrorCode;
  /** Field errors from a 400 VALIDATION_ERROR, to show next to each form field. */
  readonly details: readonly ErrorDetail[];

  constructor({ status, code, message, details = [] }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
