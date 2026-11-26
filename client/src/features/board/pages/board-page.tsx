import type { ReactElement } from 'react';

import { DocumentTitle } from '@/components/document-title';
import { BoardColumn } from '@/features/board/components/board-column';
import { useBoard } from '@/features/board/hooks/use-board';
import { useCurrentProject } from '@/features/projects/hooks/use-project';

/**
 * The project board (BRD-1, wireframe 03 A): one column per status, left to right in workflow
 * order, each with its total and its cards. ProjectTabsLayout draws the project header above it.
 */
export function BoardPage(): ReactElement {
  const project = useCurrentProject();
  const board = useBoard(project.key);

  if (!board.isSuccess) {
    return <DocumentTitle title={`${project.key} board`} />;
  }

  return (
    <>
      <DocumentTitle title={`${project.key} board`} />
      <div className="grid grid-cols-4 gap-3">
        {board.data.columns.map((column) => (
          <BoardColumn key={column.status} projectKey={project.key} column={column} />
        ))}
      </div>
    </>
  );
}
