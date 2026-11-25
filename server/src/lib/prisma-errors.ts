import { Prisma } from '../generated/prisma/client.js';

// Prisma's code for a unique constraint violation.
const UNIQUE_VIOLATION = 'P2002';

/** Whether a Prisma write failed because a unique index already holds the value. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

// Prisma's code for "the record to update or delete does not exist".
const RECORD_NOT_FOUND = 'P2025';

/** Whether a Prisma update or delete failed because the row it targets doesn't exist (any more). */
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND;
}
