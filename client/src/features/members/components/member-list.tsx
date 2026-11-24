import { Role } from '@mini-jira/shared';
import type { Member } from '@mini-jira/shared';
import type { ReactElement } from 'react';

import { Avatar } from '@/components/avatar';

const ROLE_LABELS: Record<Role, string> = {
  [Role.OWNER]: 'Owner',
  [Role.MEMBER]: 'Member',
};

const PLACEHOLDER_ROW_COUNT = 3;

/**
 * One member: initials, name, email, and role (wireframe 06 A). On phones the name, email, and
 * role stack under each other (06 G); from 640px up they sit in columns.
 */
function MemberRow({ member }: { member: Member }): ReactElement {
  return (
    <li className="flex items-start gap-3 py-3 sm:items-center">
      {/* The name is written next to it, so screen readers skip the initials. */}
      <span aria-hidden="true">
        <Avatar name={member.name} />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem] sm:items-center sm:gap-4">
        <p className="font-medium break-words">{member.name}</p>
        <p className="text-sm break-all text-muted-foreground">{member.email}</p>
        <p className="text-sm">{ROLE_LABELS[member.role]}</p>
      </div>
    </li>
  );
}

/** The project's members, in the order the API gives: the owner first, then by joining date. */
export function MemberList({ members }: { members: readonly Member[] }): ReactElement {
  return (
    <ul aria-label="Members" className="divide-y">
      {members.map((member) => (
        <MemberRow key={member.userId} member={member} />
      ))}
    </ul>
  );
}

/** Grey rows shown while the members load (wireframe 06 F). */
export function MemberListSkeleton(): ReactElement {
  return (
    <div role="status">
      <span className="sr-only">Loading members</span>
      <ul aria-hidden="true" className="divide-y motion-safe:animate-pulse">
        {Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-3">
            <span className="size-8 shrink-0 rounded-full bg-muted" />
            <span className="h-4 w-40 rounded bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
