import type { ReactElement } from 'react';

import { DocumentTitle } from '@/components/document-title';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';

/** My Projects (wireframe 02 B and H). PRJ-1 adds the header with "+ Create project". */
export function MyProjectsPage(): ReactElement {
  return (
    <>
      <DocumentTitle title="My Projects" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Projects</h1>
        <CreateProjectDialog />
      </div>
      {/* TODO(PRJ-2): the project cards, empty state, and loading and error states (wireframe 02). */}
      <p className="mt-2 text-muted-foreground">This page isn&apos;t built yet.</p>
    </>
  );
}
