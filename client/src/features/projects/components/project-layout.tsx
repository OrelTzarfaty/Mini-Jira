import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

import { isNotFoundError } from '@/api/api-error';
import { DocumentTitle } from '@/components/document-title';
import { ErrorState } from '@/components/error-state';
import { PageSkeleton } from '@/components/page-skeleton';
import { CurrentProjectContext, useProject } from '@/features/projects/hooks/use-project';
import { ProjectNotFoundPage } from '@/features/projects/pages/project-not-found-page';
import { useRouteParam } from '@/lib/use-route-param';

/**
 * Wraps every /projects/:projectKey/... page (PRJ-6). It loads the project first, so a page
 * opened from a direct URL renders only for members; the pages read it with useCurrentProject().
 */
export function ProjectLayout(): ReactElement {
  const projectKey = useRouteParam('projectKey');
  const { data: project, error, isError, isFetching, refetch } = useProject(projectKey);

  // Checked first: a project deleted (or access removed) while open must not stay on screen.
  if (isNotFoundError(error)) {
    return <ProjectNotFoundPage />;
  }

  // A failed background refresh keeps showing the project the user already has.
  if (project) {
    return (
      <CurrentProjectContext value={project}>
        <Outlet />
      </CurrentProjectContext>
    );
  }

  if (isError && !isFetching) {
    return (
      <div className="space-y-4">
        <DocumentTitle title="Something went wrong" />
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <ErrorState
          message="Couldn't load this project."
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  return <PageSkeleton label="Loading the project" />;
}
