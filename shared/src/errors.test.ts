import { describe, expect, it } from 'vitest';

import { ERROR_HTTP_STATUS, ErrorCode } from './errors.js';

describe('ERROR_HTTP_STATUS', () => {
  it.each([
    [ErrorCode.VALIDATION_ERROR, 400],
    [ErrorCode.UNAUTHENTICATED, 401],
    [ErrorCode.INVALID_CREDENTIALS, 401],
    [ErrorCode.FORBIDDEN, 403],
    [ErrorCode.NOT_FOUND, 404],
    [ErrorCode.USER_NOT_FOUND, 404],
    [ErrorCode.EDIT_CONFLICT, 409],
    [ErrorCode.EMAIL_TAKEN, 409],
    [ErrorCode.PROJECT_KEY_TAKEN, 409],
    [ErrorCode.ALREADY_MEMBER, 409],
    [ErrorCode.CANNOT_REMOVE_OWNER, 409],
    [ErrorCode.RATE_LIMITED, 429],
    [ErrorCode.INTERNAL_ERROR, 500],
  ])('SETUP-2: %s responds with HTTP %i', (code, status) => {
    expect(ERROR_HTTP_STATUS[code]).toBe(status);
  });

  it('SETUP-2: every error code has an HTTP status', () => {
    expect(Object.keys(ERROR_HTTP_STATUS).sort()).toEqual(Object.values(ErrorCode).sort());
  });
});
