import { Prisma } from '../generated/prisma/client.js';

// Prisma's code for a unique constraint violation.
const UNIQUE_VIOLATION = 'P2002';

/** Whether a Prisma write failed because a unique index already holds the value. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}
