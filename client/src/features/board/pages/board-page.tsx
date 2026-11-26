import { Status } from '@mini-jira/shared';
import { PlusIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { DocumentTitle } from '@/components/document-title';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { BoardColumn } from '@/features/board/components/board-column';
import { BoardSkeleton } from '@/features/board/components/board-skeleton';
import { useBoard } from '@/features/board/hooks/use-board';
import { useCurrentProject } from '@/features/projects/hooks/use-project';
import { useProjectTabs } from '@/features/projects/hooks/use-project-tabs';

const BOARD_CLASSES = 'grid grid-cols-4 gap-3';

/**
 * The project board (BRD-1, wireframe 03 A, G): one column per status, left to right in workflow
 * order, each with its total and its cards. ProjectTabsLayout draws the project header above it.
 */
export function BoardPage(): ReactElement {
  const project = useCurrentProject();
  const board = useBoard(project.key);

  function renderContent(): ReactElement {
    if (board.data) {
      const isEmpty = board.data.columns.every((column) => column.total === 0);

      return (
        <div className={BOARD_CLASSES}>
          {board.data.columns.map((column) => (
            <BoardColumn
              key={column.status}
              projectKey={project.key}
              column={column}
              // A new project: the first column says so and offers the next step (wireframe 03 G).
              emptyState={isEmpty && column.status === Status.TODO ? <EmptyBoard /> : undefined}
            />
          ))}
        </div>
      );
    }

    if (board.error) {
      return (
        <ErrorState
          message="Couldn't load the board."
          onRetry={() => {
            void board.refetch();
          }}
        />
      );
    }

    return <BoardSkeleton className={BOARD_CLASSES} />;
  }

  return (
    <>
      <DocumentTitle title={`${project.key} board`} />
      {renderContent()}
    </>
  );
}

/** The empty board's message in To Do (wireframe 03 G): it opens the header's Create ticket popup. */
function EmptyBoard(): ReactElement {
  const { openCreateTicket } = useProjectTabs();

  return (
    <div className="grid justify-items-start gap-3 pt-1">
      <p className="text-sm text-muted-foreground">No tickets yet.</p>
      {/* Outline, not navy: the header's "Create ticket" is the view's one primary button. */}
      <Button variant="outline" className="bg-background" onClick={openCreateTicket}>
        <PlusIcon aria-hidden="true" />
        Create the first ticket
      </Button>
    </div>
  );
}
