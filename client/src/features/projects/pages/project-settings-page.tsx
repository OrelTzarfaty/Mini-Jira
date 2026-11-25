import { Role } from '@mini-jira/shared';
import type { Project } from '@mini-jira/shared';
import { ArrowLeftIcon, LockIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Button } from '@/components/ui/button';
import { MembersSection } from '@/features/members/components/members-section';
import { SettingsSection } from '@/features/projects/components/settings-section';
import { useCurrentProject } from '@/features/projects/hooks/use-project';
import { cn } from '@/lib/utils';

/**
 * Name, key, and description, read-only for now: editing them comes in PRJ-5. The key never
 * changes (architecture §11), so it keeps the lock note even then.
 */
function ProjectDetails({ project }: { project: Project }): ReactElement {
  return (
    <dl className="grid gap-4">
      <div className="grid gap-1">
        <dt className="text-sm font-medium">Name</dt>
        <dd className="break-words">{project.name}</dd>
      </div>
      <div className="grid gap-1">
        <dt className="text-sm font-medium">Key</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {project.key}
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {`Can't be changed — it's part of every ticket key (${project.key}-12)`}
          </span>
        </dd>
      </div>
      <div className="grid gap-1">
        <dt className="text-sm font-medium">Description</dt>
        <dd
          className={cn(
            'break-words whitespace-pre-line',
            !project.description && 'text-muted-foreground',
          )}
        >
          {project.description ?? 'No description'}
        </dd>
      </div>
    </dl>
  );
}

/** What a member sees on the settings URL: the page is the owner's only (wireframe 06 E). */
function OwnerOnlyMessage({ projectKey }: { projectKey: string }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="font-medium">Only the project owner can open settings.</p>
      <Button asChild variant="outline">
        <Link to={`/projects/${projectKey}/board`}>
          <ArrowLeftIcon aria-hidden="true" />
          Back to the board
        </Link>
      </Button>
    </div>
  );
}

/** Project settings (wireframe 06): details, members (PRJ-3), and the danger zone (PRJ-5). */
export function ProjectSettingsPage(): ReactElement {
  const project = useCurrentProject();
  const title = `${project.key} settings`;

  // The API refuses owner actions to members anyway (403); this keeps them from the screen.
  if (project.role !== Role.OWNER) {
    return (
      <>
        <DocumentTitle title={title} />
        <OwnerOnlyMessage projectKey={project.key} />
      </>
    );
  }

  return (
    <div className="grid max-w-3xl gap-8">
      <DocumentTitle title={title} />
      <SettingsSection title="Project details">
        <ProjectDetails project={project} />
      </SettingsSection>
      <MembersSection projectKey={project.key} />
      {/* The red frame marks the only destructive part of the page; the Delete project button
          and its dialog come in PRJ-5. */}
      <SettingsSection title="Danger zone" className="border-destructive">
        <h3 className="font-medium">Delete this project</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Deletes the project with all its tickets, comments, and history. This can&apos;t be
          undone.
        </p>
      </SettingsSection>
    </div>
  );
}
