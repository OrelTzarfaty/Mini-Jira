import { ErrorCode, publicUserSchema } from '@mini-jira/shared';
import type { LoginInput, PublicUser, RegisterInput } from '@mini-jira/shared';

import { z } from 'zod';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { ConflictError, InvalidCredentialsError, UnauthenticatedError } from '../../lib/errors.js';
import { hashPassword, verifyDummyPassword, verifyPassword } from '../../lib/password.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';

// Only the fields a client may see; passwordHash never leaves this service.
const PUBLIC_USER_FIELDS = { id: true, name: true, email: true } as const;
// The shape of a user ID. The id column is a PostgreSQL uuid, which rejects any other string
// with a database error (Prisma P2007) instead of "not found".
const USER_ID_SCHEMA = z.guid();

export interface AuthService {
  register(input: RegisterInput): Promise<PublicUser>;
  /** Returns the user when the email and password match; otherwise throws 401. */
  login(input: LoginInput): Promise<PublicUser>;
  /** Whether a user with this ID still exists (a session token may outlive its user). */
  userExists(userId: string): Promise<boolean>;
  /** The logged-in user's public fields; throws 401 when the user no longer exists. */
  getCurrentUser(userId: string): Promise<PublicUser>;
}

const emailTaken = (): ConflictError =>
  new ConflictError(ErrorCode.EMAIL_TAKEN, 'This email is already registered');

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

    // AUTH-2: the schema already trimmed and lowercased the email, like at register.
    async login({ email, password }) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { ...PUBLIC_USER_FIELDS, passwordHash: true },
      });

      if (!user) {
        // Still runs a full Argon2id verify, so an unknown email takes as long as a wrong
        // password and the response time doesn't reveal whether the account exists.
        await verifyDummyPassword(password);
        throw new InvalidCredentialsError();
      }

      if (!(await verifyPassword(user.passwordHash, password))) {
        throw new InvalidCredentialsError();
      }

      // Only the public fields leave the service; the hash stays here.
      return { id: user.id, name: user.name, email: user.email };
    },

    // AUTH-3: one primary-key lookup per protected request; only the ID is read.
    async userExists(userId) {
      // Only tokens we signed get here, and they hold real IDs; this is a fail-closed guard.
      if (!USER_ID_SCHEMA.safeParse(userId).success) {
        return false;
      }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

      return user !== null;
    },

    // AUTH-4: requireAuth already checked the user, but the row can be deleted between that
    // check and this read; that is the same "no session" 401, never a 404 or 500.
    async getCurrentUser(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: PUBLIC_USER_FIELDS,
      });
      if (!user) {
        throw new UnauthenticatedError();
      }

      // Parsed through the shared schema so only the documented public fields leave the API.
      return publicUserSchema.parse(user);
    },
  };
}
