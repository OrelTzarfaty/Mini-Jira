import {
  alreadyMemberMessage,
  CANNOT_REMOVE_OWNER_MESSAGE,
  ErrorCode,
  MEMBER_NOT_FOUND_MESSAGE,
  memberSchema,
  Role,
  USER_NOT_FOUND_MESSAGE,
} from '@mini-jira/shared';
import type { AddMemberInput, Member, MemberPage } from '@mini-jira/shared';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { pageWindow, toPage } from '../../lib/pagination.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';

export interface MembersService {
  /** PRJ-3: one page of the project's members, the owner first. */
  listMembers(projectId: string, page: number): Promise<MemberPage>;
  /**
   * PRJ-3: adds the registered user with this email as a MEMBER. Throws 404 USER_NOT_FOUND when
   * no user has the email, and 409 ALREADY_MEMBER when they are in the project already.
   */
  addMember(projectId: string, input: AddMemberInput): Promise<Member>;
  /**
   * PRJ-4: removes the user's MEMBER row from the project and, in the same transaction,
   * unassigns their tickets in this project (TKT-5). Throws 409 CANNOT_REMOVE_OWNER when
   * the user is the project's owner, and 404 NOT_FOUND when they aren't in the project.
   */
  removeMember(projectId: string, userId: string): Promise<void>;
}

// Only the public user fields: the password hash never leaves this module.
const MEMBER_FIELDS = {
  role: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

interface MemberRow {
  role: Role;
  joinedAt: Date;
  user: { id: string; name: string; email: string };
}

/** The API shape of a membership row, parsed through the shared schema (a DTO, standards §6.3). */
function toMemberResponse({ role, joinedAt, user }: MemberRow): Member {
  return memberSchema.parse({
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    joinedAt: joinedAt.toISOString(),
  });
}

// PRJ-3: both errors point the client at the email field (wireframe 06 C).
const userNotFound = (): NotFoundError =>
  new NotFoundError(USER_NOT_FOUND_MESSAGE, ErrorCode.USER_NOT_FOUND, [
    { field: 'email', message: USER_NOT_FOUND_MESSAGE },
  ]);

const alreadyMember = (name: string): ConflictError =>
  new ConflictError(ErrorCode.ALREADY_MEMBER, alreadyMemberMessage(name), [
    { field: 'email', message: alreadyMemberMessage(name) },
  ]);

export function createMembersService(prisma: PrismaClient): MembersService {
  return {
    // PRJ-3: the owner first, then by join time. PostgreSQL sorts an enum in the order its values
    // are declared (OWNER, MEMBER), so `role asc` puts the owner on top. userId breaks ties
    // between members who joined in the same millisecond, so every row has one fixed place and
    // no member is shown on two pages or skipped. The (projectId, userId) primary key finds the
    // project's rows; a project has few members, so sorting them needs no extra index.
    async listMembers(projectId, page) {
      const where = { projectId };
      // Two separate reads, not a transaction: a member added in between only shifts the count
      // by one, and the next page request shows the change.
      const [rows, total] = await Promise.all([
        prisma.projectMember.findMany({
          where,
          select: MEMBER_FIELDS,
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { userId: 'asc' }],
          ...pageWindow(page),
        }),
        prisma.projectMember.count({ where }),
      ]);

      return toPage(rows.map(toMemberResponse), total, page);
    },

    // PRJ-3: the schema already trimmed and lowercased the email like register does, so the
    // unique email index finds the user in any letter case.
    async addMember(projectId, { email }) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: MEMBER_FIELDS.user.select,
      });
      if (!user) {
        throw userNotFound();
      }

      try {
        // No "already a member?" read first: it would still race with a second add at the same
        // moment, so the (projectId, userId) primary key is the one source of truth. It also
        // covers the owner adding themselves (the owner is a member row too).
        const { role, joinedAt } = await prisma.projectMember.create({
          data: { projectId, userId: user.id, role: Role.MEMBER },
          select: { role: true, joinedAt: true },
        });

        return toMemberResponse({ role, joinedAt, user });
      } catch (error) {
        // The primary key is the only unique index on this table, so this always means "member".
        if (isUniqueViolation(error)) {
          throw alreadyMember(user.name);
        }
        throw error;
      }
    },

    // PRJ-4: the delete itself only matches a MEMBER row, so the owner's row can never be
    // deleted, even by two requests at the same moment: there is no "read the role, then delete"
    // gap. Only when nothing was deleted do we read the row, to tell the owner (409) from a user
    // who isn't in the project (404). Roles never change (architecture §8), so that read can't
    // see a different role than the delete did.
    async removeMember(projectId, userId) {
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.projectMember.deleteMany({
          where: { projectId, userId, role: Role.MEMBER },
        });

        if (count === 0) {
          const membership = await tx.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
            select: { role: true },
          });
          throw membership?.role === Role.OWNER
            ? new ConflictError(ErrorCode.CANNOT_REMOVE_OWNER, CANNOT_REMOVE_OWNER_MESSAGE)
            : new NotFoundError(MEMBER_NOT_FOUND_MESSAGE);
        }

        // PRJ-4, TKT-5: in this same transaction, unassign the removed user's tickets in this
        // project only, so the membership and the assignments change together (both or
        // neither). The [assigneeId] index finds them. @updatedAt is bumped on these tickets on
        // purpose: they changed, so an edit form loaded before the removal gets 409 (CON-1).
        // The delete above runs first: an assign at the same moment holds a FOR SHARE lock on
        // the membership row (tickets.service), so the delete waits for it, and this statement
        // then sees that ticket too.
        await tx.ticket.updateMany({
          where: { projectId, assigneeId: userId },
          data: { assigneeId: null },
        });
      });
    },
  };
}
