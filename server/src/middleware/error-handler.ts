import { ERROR_HTTP_STATUS, ErrorCode } from '@mini-jira/shared';
import type { ErrorResponse } from '@mini-jira/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError, NotFoundError, ValidationError } from '../lib/errors.js';

const INVALID_REQUEST_MESSAGE = 'The request is invalid';
const INTERNAL_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface KnownRequestError {
  code: ErrorCode;
  message: string;
}

// Errors from the body parser (`express.json`), by their `type`.
const KNOWN_REQUEST_ERRORS: Readonly<Record<string, KnownRequestError>> = {
  'entity.parse.failed': {
    code: ErrorCode.VALIDATION_ERROR,
    message: 'The request body must be valid JSON',
  },
  'entity.too.large': {
    code: ErrorCode.PAYLOAD_TOO_LARGE,
    message: 'The request body is too large',
  },
};

interface ClientRequestError {
  status: number;
  type?: string;
}

function isClientRequestError(error: unknown): error is ClientRequestError {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return false;
  }
  const { status } = error;

  return typeof status === 'number' && status >= 400 && status < 500;
}

function toAppError(error: unknown): AppError | undefined {
  if (error instanceof AppError) {
    return error;
  }
  if (isClientRequestError(error)) {
    const known = error.type ? KNOWN_REQUEST_ERRORS[error.type] : undefined;

    return known
      ? new AppError(known.code, known.message)
      : new ValidationError(INVALID_REQUEST_MESSAGE);
  }

  return undefined;
}

function toResponseBody({ code, message, details }: AppError): ErrorResponse {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('The requested resource was not found'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);

    return;
  }

  const appError = toAppError(error);

  if (appError) {
    req.log.warn({ code: appError.code }, appError.message);
    res.status(appError.status).json(toResponseBody(appError));

    return;
  }

  req.log.error({ err: error }, 'Unexpected request error');
  const body: ErrorResponse = {
    error: { code: ErrorCode.INTERNAL_ERROR, message: INTERNAL_ERROR_MESSAGE },
  };
  res.status(ERROR_HTTP_STATUS[ErrorCode.INTERNAL_ERROR]).json(body);
};
