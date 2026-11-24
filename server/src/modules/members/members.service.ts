import { memberSchema } from '@mini-jira/shared';
import type { Member, MemberPage, Role } from '@mini-jira/shared';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { pageWindow, toPage } from '../../lib/pagination.js';

export interface MembersService {
  /** PRJ-3: one page of the project's members, the owner first. */
  listMembers(projectId: string, page: number): Promise<MemberPage>;
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
  };
}
