import { Prisma } from '../generated/prisma/client.js';

// Prisma's code for a unique constraint violation.
const UNIQUE_VIOLATION = 'P2002';
// Prisma's code for an update or delete whose row doesn't exist (any more).
const RECORD_NOT_FOUND = 'P2025';

/** Whether a Prisma write failed because a unique index already holds the value. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

/** Whether a Prisma update or delete failed because its row was not found (e.g. deleted meanwhile). */
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND;
}
