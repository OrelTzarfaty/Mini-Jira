import { Role } from '@mini-jira/shared';
import type { Member } from '@mini-jira/shared';
import type { ReactElement, Ref } from 'react';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';

const ROLE_LABELS: Record<Role, string> = {
  [Role.OWNER]: 'Owner',
  [Role.MEMBER]: 'Member',
};

const PLACEHOLDER_ROW_COUNT = 3;

interface MemberRowProps {
  member: Member;
  onRemove: (member: Member) => void;
}

/**
 * One member: initials, name, email, role, and Remove (wireframe 06 A). On phones the name,
 * email, and role stack under each other, with Remove on the role's line (06 G); from 640px up
 * they sit in columns.
 */
function MemberRow({ member, onRemove }: MemberRowProps): ReactElement {
  const isOwner = member.role === Role.OWNER;

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
      {/* The owner can't be removed (PRJ-4), so their row has no button, only the empty column
          that keeps the other columns lined up from 640px up. */}
      {isOwner ? (
        <span aria-hidden="true" className="hidden w-20 shrink-0 sm:block" />
      ) : (
        <div className="flex shrink-0 self-end sm:w-20 sm:justify-end sm:self-center">
          <Button
            variant="ghost"
            // The visible text is "Remove"; the name tells screen reader users whose row it is.
            aria-label={`Remove ${member.name}`}
            onClick={() => {
              onRemove(member);
            }}
          >
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}

interface MemberListProps {
  members: readonly Member[];
  /** Asks to remove a member; the owner's row has no Remove button. */
  onRemove: (member: Member) => void;
  /** Takes focus after a removed member's row (and its Remove button) is gone. */
  ref?: Ref<HTMLUListElement>;
}

/** The project's members, in the order the API gives: the owner first, then by joining date. */
export function MemberList({ members, onRemove, ref }: MemberListProps): ReactElement {
  return (
    <ul ref={ref} tabIndex={-1} aria-label="Members" className="divide-y">
      {members.map((member) => (
        <MemberRow key={member.userId} member={member} onRemove={onRemove} />
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
