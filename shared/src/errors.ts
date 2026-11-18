import { z } from 'zod';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EDIT_CONFLICT: 'EDIT_CONFLICT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  PROJECT_KEY_TAKEN: 'PROJECT_KEY_TAKEN',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  CANNOT_REMOVE_OWNER: 'CANNOT_REMOVE_OWNER',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  EDIT_CONFLICT: 409,
  EMAIL_TAKEN: 409,
  PROJECT_KEY_TAKEN: 409,
  ALREADY_MEMBER: 409,
  CANNOT_REMOVE_OWNER: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export const errorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ErrorCode),
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
