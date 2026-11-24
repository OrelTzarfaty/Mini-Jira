import type { ProjectListItem } from '@mini-jira/shared';
import type { ReactElement, Ref } from 'react';
import { Link } from 'react-router';

import { ProjectKeyBadge, ProjectRoleLabel } from '@/features/projects/components/project-labels';

interface ProjectCardProps {
  project: ProjectListItem;
  /** Lets My Projects move focus to the first card that "Show more" added. */
  ref?: Ref<HTMLAnchorElement>;
}

/** One project on My Projects (wireframe 02 B). The whole card opens the project's board. */
export function ProjectCard({ project, ref }: ProjectCardProps): ReactElement {
  return (
    <Link
      ref={ref}
      to={`/projects/${project.key}/board`}
      className="flex h-full flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/60"
    >
      <div>
        <ProjectKeyBadge projectKey={project.key} />
      </div>
      {/* break-words: a long name without spaces wraps instead of widening the card. */}
      <h2 className="font-medium break-words">{project.name}</h2>
      <p className="mt-auto flex items-center justify-between gap-4 pt-2">
        <ProjectRoleLabel role={project.role} />
        <span className="text-sm text-muted-foreground">{project.openTicketCount} open</span>
      </p>
    </Link>
  );
}

/** Grey card shapes while My Projects loads (wireframe 02 G). */
export function ProjectCardSkeleton(): ReactElement {
  return (
    <div className="flex h-32 flex-col gap-2 rounded-lg border p-4">
      <div className="h-6 w-12 rounded-sm bg-muted" />
      <div className="h-5 w-2/3 rounded-sm bg-muted" />
      <div className="mt-auto flex justify-between">
        <div className="h-4 w-14 rounded-sm bg-muted" />
        <div className="h-4 w-12 rounded-sm bg-muted" />
      </div>
    </div>
  );
}
