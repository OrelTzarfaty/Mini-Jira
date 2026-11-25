import { ArrowLeftIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Button } from '@/components/ui/button';

/**
 * Shown for a project URL whose project is missing or that the user isn't a member of (PRJ-6,
 * modelled on wireframe 04 G). Both cases look the same, so the page never tells an outsider
 * that the project exists, and it never shows the project's name.
 */
export function ProjectNotFoundPage(): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <DocumentTitle title="Project not found" />
      <h1 className="text-2xl font-semibold">Project not found</h1>
      <p className="max-w-sm text-muted-foreground">
        It may have been deleted, or you don&apos;t have access to it.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/projects">
          <ArrowLeftIcon aria-hidden="true" />
          Back to My Projects
        </Link>
      </Button>
    </div>
  );
}
