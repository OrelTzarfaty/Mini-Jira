import { ErrorCode } from '@mini-jira/shared';
import type { PublicUser, RegisterInput } from '@mini-jira/shared';

import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ConflictError } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';

// Prisma's code for a unique constraint violation.
const UNIQUE_VIOLATION = 'P2002';

// Only the fields a client may see; passwordHash never leaves this service.
const PUBLIC_USER_FIELDS = { id: true, name: true, email: true } as const;

export interface AuthService {
  register(input: RegisterInput): Promise<PublicUser>;
}

const emailTaken = (): ConflictError =>
  new ConflictError(ErrorCode.EMAIL_TAKEN, 'This email is already registered');

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

export function createAuthService(prisma: PrismaClient): AuthService {
  return {
    // AUTH-1: the schema already trimmed and lowercased the email, so the unique index on
    // email also blocks the same address in another letter case.
    async register({ name, email, password }) {
      // Checked first so a taken email gets its answer without the slow hash.
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        throw emailTaken();
      }

      const passwordHash = await hashPassword(password);

      try {
        return await prisma.user.create({
          data: { name, email, passwordHash },
          select: PUBLIC_USER_FIELDS,
        });
      } catch (error) {
        // Two sign-ups with the same email at the same moment both pass the check above; the
        // unique index stops the second one. Email is the only unique field a client controls
        // (the ID is generated), so this violation always means the email is taken.
        if (isUniqueViolation(error)) {
          throw emailTaken();
        }
        throw error;
      }
    },
  };
}
