import { zodResolver } from '@hookform/resolvers/zod';
import { updateProjectSchema } from '@mini-jira/shared';
import type { ProjectDetail, UpdateProjectInput } from '@mini-jira/shared';
import { Loader2Icon, LockIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateProjectMutation } from '@/features/projects/hooks/use-update-project-mutation';
import { showServerError } from '@/lib/show-server-error';

// The form's field names, from the shared schema, to match the server's details[].field.
const PROJECT_DETAILS_FIELDS = updateProjectSchema.keyof().options;

/** What the form starts from: the saved project, with "no description" as an empty field. */
function formValuesOf(project: ProjectDetail): { name: string; description: string } {
  return { name: project.name, description: project.description ?? '' };
}

/**
 * Project details on the settings page (wireframe 06 B, PRJ-5): the name and description can be
 * edited; the key is shown locked, because it never changes (architecture §11).
 */
export function ProjectDetailsForm({ project }: { project: ProjectDetail }): ReactElement {
  const updateProjectMutation = useUpdateProjectMutation(project.key);
  const keyLabelId = useId();
  // "Project updated" after a save; always in the page, so screen readers announce it.
  const [statusMessage, setStatusMessage] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: formValuesOf(project),
  });
  const isSending = updateProjectMutation.isPending;

  // Gets the schema's output: trimmed, an empty description as null (which clears it).
  function handleValidSubmit(input: UpdateProjectInput): void {
    // Cleared first, so a second save is announced again.
    setStatusMessage('');
    updateProjectMutation.mutate(input, {
      onSuccess: (updated) => {
        // The saved values become the new starting point, so Save changes is disabled again.
        reset(formValuesOf(updated));
        setStatusMessage('Project updated');
      },
      // setError only adds messages, so what the user typed stays in the fields.
      onError: (error) => {
        showServerError(error, setError, { fields: PROJECT_DETAILS_FIELDS });
      },
    });
  }

  return (
    // noValidate: the schema shows its own errors under each field, not the browser's bubbles.
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
      className="grid gap-4"
    >
      <FormField label="Name" error={errors.name?.message}>
        {(control) => <Input {...control} {...register('name')} autoComplete="off" />}
      </FormField>
      {/* Plain text, not a field: there is nothing to type, so nothing to tab to. */}
      <div role="group" aria-labelledby={keyLabelId} className="grid gap-1.5">
        <p id={keyLabelId} className="text-sm font-medium">
          Key
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {project.key} {/* The space keeps the key and the note apart for screen readers. */}
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {`Can't be changed — it's part of every ticket key (${project.key}-12)`}
          </span>
        </p>
      </div>
      <FormField label="Description" error={errors.description?.message}>
        {(control) => <Textarea {...control} {...register('description')} rows={3} />}
      </FormField>
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p role="status" className="text-sm">
          {statusMessage}
        </p>
        {/* Disabled until something changes (06 B), and while sending, so a double click
            can't save twice. */}
        <Button type="submit" disabled={!isDirty || isSending}>
          {isSending && <Loader2Icon aria-hidden="true" className="animate-spin" />}
          {isSending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
