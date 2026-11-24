import {
  ERROR_HTTP_STATUS,
  ErrorCode,
  INVALID_CREDENTIALS_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import type { ErrorDetail } from '@mini-jira/shared';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetail[] | undefined;

  constructor(code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return ERROR_HTTP_STATUS[this.code];
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

// AUTH-2: one error for an unknown email and a wrong password, so the answer never says which.
export class InvalidCredentialsError extends AppError {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, INVALID_CREDENTIALS_MESSAGE);
  }
}

// AUTH-3: no valid session cookie (missing, tampered or expired); the client sends the user to log in.
export class UnauthenticatedError extends AppError {
  constructor() {
    super(ErrorCode.UNAUTHENTICATED, UNAUTHENTICATED_MESSAGE);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(ErrorCode.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(ErrorCode.NOT_FOUND, message);
  }
}

type ConflictCode = Extract<
  ErrorCode,
  'EDIT_CONFLICT' | 'EMAIL_TAKEN' | 'PROJECT_KEY_TAKEN' | 'ALREADY_MEMBER' | 'CANNOT_REMOVE_OWNER'
>;

export class ConflictError extends AppError {
  // `details` points the client at the field to fix, e.g. the key in PRJ-1.
  constructor(code: ConflictCode, message: string, details?: ErrorDetail[]) {
    super(code, message, details);
  }
}
