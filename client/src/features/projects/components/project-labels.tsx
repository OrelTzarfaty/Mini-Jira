import { Role } from '@mini-jira/shared';
import { cn } from 'cn';
import type { ReactElement } from 'react';

const ROLE_LABELS: Record<Role, string> = {
  [Role.OWNER]: 'Owner',
  [Role.MEMBER]: 'Member',
};

// The word tells the roles apart; the color and weight only make it quicker to see (wireframe
// 02 B: Owner in navy, Member in grey; DESIGN.md "The Never Color Alone Rule").
const ROLE_CLASSES: Record<Role, string> = {
  [Role.OWNER]: 'font-medium text-primary',
  [Role.MEMBER]: 'text-muted-foreground',
};

/** The project key in a small frame, like [WEB] in wireframe 02. */
export function ProjectKeyBadge({ projectKey }: { projectKey: string }): ReactElement {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-sm border px-1.5 text-xs font-medium">
      {projectKey}
    </span>
  );
}

/** The user's role in a project: "Owner" or "Member". */
export function ProjectRoleLabel({
  role,
  className,
}: {
  role: Role;
  className?: string;
}): ReactElement {
  return <span className={cn('text-sm', ROLE_CLASSES[role], className)}>{ROLE_LABELS[role]}</span>;
}
