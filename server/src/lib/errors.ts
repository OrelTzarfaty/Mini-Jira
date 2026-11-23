import { ERROR_HTTP_STATUS, ErrorCode } from '@mini-jira/shared';
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
  constructor(code: ConflictCode, message: string) {
    super(code, message);
  }
}
