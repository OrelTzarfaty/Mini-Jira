import type { ProjectListItem } from '@mini-jira/shared';
import { FolderKanbanIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { DocumentTitle } from '@/components/document-title';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { ProjectCard, ProjectCardSkeleton } from '@/features/projects/components/project-card';
import { useMyProjects } from '@/features/projects/hooks/use-my-projects';

const SKELETON_CARD_COUNT = 3;
const GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

/**
 * The loaded pages as one list. A project created between two "Show more" clicks moves the later
 * pages by one, so a project can come back twice; it is shown once.
 */
function uniqueProjects(pages: readonly { items: ProjectListItem[] }[]): ProjectListItem[] {
  const projectsById = new Map(pages.flatMap((page) => page.items).map((p) => [p.id, p]));

  return [...projectsById.values()];
}

function ProjectGridSkeleton(): ReactElement {
  return (
    <div role="status">
      <span className="sr-only">Loading your projects</span>
      <div aria-hidden="true" className={`${GRID_CLASSES} motion-safe:animate-pulse`}>
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function NoProjects(): ReactElement {
  return (
    <EmptyState
      icon={<FolderKanbanIcon />}
      title="No projects yet"
      description="Create a project to start tracking your team's work, or ask a project owner to add you by email."
      action={<CreateProjectDialog />}
    />
  );
}

/** My Projects (wireframe 02 B, C, G, H; PRJ-2): the projects the user is a member of. */
export function MyProjectsPage(): ReactElement {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    refetch,
  } = useMyProjects();
  // The first card that "Show more" adds gets focus, so focus isn't lost when the button goes.
  const [firstAddedIndex, setFirstAddedIndex] = useState<number | null>(null);
  const projects = data ? uniqueProjects(data.pages) : [];
  // One primary button per view (DESIGN.md): the empty state brings its own.
  const hasHeaderButton = projects.length > 0 || (error !== null && !data);

  /** Focuses the first added card once it is on screen, then forgets it. */
  function focusFirstAddedCard(link: HTMLAnchorElement | null): void {
    if (link) {
      link.focus();
      setFirstAddedIndex(null);
    }
  }

  function handleShowMore(): void {
    setFirstAddedIndex(projects.length);
    void fetchNextPage();
  }

  function renderContent(): ReactElement {
    if (data) {
      return projects.length === 0 ? <NoProjects /> : renderProjects();
    }

    if (error) {
      return (
        <ErrorState
          message="Couldn't load your projects."
          onRetry={() => {
            void refetch();
          }}
        />
      );
    }

    return <ProjectGridSkeleton />;
  }

  function renderProjects(): ReactElement {
    return (
      <>
        <ul className={GRID_CLASSES}>
          {projects.map((project, index) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                ref={index === firstAddedIndex ? focusFirstAddedCard : undefined}
              />
            </li>
          ))}
        </ul>
        {isFetchNextPageError && (
          <p role="alert" className="mt-6 text-center text-sm">
            Couldn&apos;t load more projects. Try again.
          </p>
        )}
        {hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" disabled={isFetchingNextPage} onClick={handleShowMore}>
              {isFetchingNextPage && <Loader2Icon aria-hidden="true" className="animate-spin" />}
              {isFetchingNextPage ? 'Loading…' : 'Show more'}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <DocumentTitle title="My Projects" />
      <div className="mb-6 flex min-h-8 items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Projects</h1>
        {hasHeaderButton && <CreateProjectDialog />}
      </div>
      {renderContent()}
    </>
  );
}
