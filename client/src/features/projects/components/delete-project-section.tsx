import type { ProjectDetail } from '@mini-jira/shared';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '@/features/projects/components/settings-section';
import { useDeleteProjectMutation } from '@/features/projects/hooks/use-delete-project-mutation';
import { deletedProjectState } from '@/features/projects/lib/deleted-project';
import { serverErrorMessage } from '@/lib/show-server-error';

/** "1 ticket", "0 tickets", "48 tickets". */
function ticketCountText(count: number): string {
  return `${String(count)} ${count === 1 ? 'ticket' : 'tickets'}`;
}

/**
 * The danger zone on the settings page (wireframe 06 A and D, PRJ-5): Delete project, after a
 * confirmation in which the owner types the project key.
 */
export function DeleteProjectSection({ project }: { project: ProjectDetail }): ReactElement {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [typedKey, setTypedKey] = useState('');
  const deleteProjectMutation = useDeleteProjectMutation(project.key, {
    // Straight to My Projects, which says "Project WEB deleted" (06 D). Replace, so Back
    // doesn't return to the settings of a project that is gone.
    onDeleted: () => {
      void navigate('/projects', { replace: true, state: deletedProjectState(project.key) });
    },
  });
  // Exact and case-sensitive: the owner types the key as it is shown ("WEB", not "web"), the
  // strictest form of this safety step for the most destructive action in the app.
  const isKeyTyped = typedKey === project.key;

  function askToDelete(): void {
    // A new dialog starts empty, without the error of the last one.
    deleteProjectMutation.reset();
    setTypedKey('');
    setIsDialogOpen(true);
  }

  return (
    // The red frame marks the only destructive part of the page (06 A).
    <SettingsSection title="Danger zone" className="border-destructive">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-medium">Delete this project</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deletes the project with all its tickets, comments, and history. This can&apos;t be
            undone.
          </p>
        </div>
        <Button variant="destructive" className="self-start sm:self-end" onClick={askToDelete}>
          Delete project
        </Button>
      </div>
      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`Delete project ${project.key}?`}
        description={`This permanently deletes the project, its ${ticketCountText(project.ticketCount)}, and all comments and history. This can't be undone.`}
        confirmLabel="Delete project"
        pendingLabel="Deleting…"
        isConfirmDisabled={!isKeyTyped}
        isPending={deleteProjectMutation.isPending}
        error={
          deleteProjectMutation.error ? serverErrorMessage(deleteProjectMutation.error) : undefined
        }
        onConfirm={() => {
          if (isKeyTyped) {
            deleteProjectMutation.mutate();
          }
        }}
      >
        <FormField label={`Type ${project.key} to confirm`}>
          {(control) => (
            <Input
              {...control}
              value={typedKey}
              onChange={(event) => {
                setTypedKey(event.target.value);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-32"
            />
          )}
        </FormField>
      </ConfirmDialog>
    </SettingsSection>
  );
}
