import { zodResolver } from '@hookform/resolvers/zod';
import { EDIT_CONFLICT_MESSAGE, ErrorCode, updateTicketSchema } from '@mini-jira/shared';
import type { Ticket, UpdateTicketInput } from '@mini-jira/shared';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { AssigneeField } from '@/features/tickets/components/assignee-field';
import {
  TicketChoiceField,
  TicketDescriptionField,
  TicketDueDateField,
  TicketTitleField,
} from '@/features/tickets/components/ticket-form-fields';
import { useUpdateTicketMutation } from '@/features/tickets/hooks/use-update-ticket-mutation';
import { emptyToNull } from '@/features/tickets/lib/empty-to-null';
import { ticketChanges } from '@/features/tickets/lib/ticket-changes';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from '@/features/tickets/lib/ticket-labels';
import { showServerError } from '@/lib/show-server-error';

// The form's field names, from the shared schema, to match the server's details[].field.
// updatedAt isn't a field the user sees, so an error about it shows as the form's alert.
const EDIT_TICKET_FIELDS = updateTicketSchema
  .keyof()
  .options.filter((field) => field !== 'updatedAt');

// Wireframe 04 C. The full banner with "Reload ticket" comes with CON-1.
const EDIT_CONFLICT_ALERT = `${EDIT_CONFLICT_MESSAGE} while you were editing. Your changes have not been saved. They're still in the form below.`;

interface EditTicketFormProps {
  projectKey: string;
  ticket: Ticket;
  /** Back to view mode without saving (Cancel, or Save with nothing changed). */
  onCancel: () => void;
  /** Back to view mode after the server saved the changes. */
  onSaved: () => void;
}

/**
 * The ticket page's edit mode (wireframe 04 B, TKT-3): title and description on the left, status,
 * assignee (TKT-5), priority, type, and due date on the right. The shared updateTicketSchema
 * checks it; the estimate waits for the mentor's OK (DOC-5). The server's field errors show under
 * the same fields (also "Assignee must be a project member"), and nothing typed is lost on any
 * error.
 */
export function EditTicketForm({
  projectKey,
  ticket,
  onCancel,
  onSaved,
}: EditTicketFormProps): ReactElement {
  // The ticket as it was when Edit was clicked: the version this edit is based on. A background
  // refresh may bring a newer one, but the form must keep comparing with, and later send the
  // updatedAt of, the version the user started from (CON-1).
  const [loadedTicket] = useState(ticket);
  const headingId = useId();
  const updateTicketMutation = useUpdateTicketMutation(projectKey, loadedTicket.key);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: {
      updatedAt: loadedTicket.updatedAt,
      title: loadedTicket.title,
      description: loadedTicket.description ?? '',
      type: loadedTicket.type,
      priority: loadedTicket.priority,
      status: loadedTicket.status,
      dueDate: loadedTicket.dueDate,
      assigneeId: loadedTicket.assignee?.id ?? null,
    },
  });
  const title = useWatch({ control, name: 'title' }) ?? '';
  const isSaving = updateTicketMutation.isPending;

  // Edit moves focus into the form, to the first field (the button that opened it is gone).
  useEffect(() => {
    setFocus('title');
  }, [setFocus]);

  // Gets the schema's output: trimmed, an empty description as null.
  function handleValidSubmit(edited: UpdateTicketInput): void {
    const changes = ticketChanges(loadedTicket, edited);

    if (changes === null) {
      // Nothing changed: nothing to save.
      onCancel();

      return;
    }

    updateTicketMutation.mutate(changes, {
      onSuccess: onSaved,
      onError: (error) => {
        showServerError(error, setError, {
          fields: EDIT_TICKET_FIELDS,
          showKnownError: (apiError) => {
            if (apiError.code !== ErrorCode.EDIT_CONFLICT) {
              return false;
            }

            setError('root.server', { message: EDIT_CONFLICT_ALERT });

            return true;
          },
        });
      },
    });
  }

  return (
    // noValidate: the schema shows its own errors under each field, not the browser's bubbles.
    <form
      noValidate
      aria-labelledby={headingId}
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
      className="grid gap-6"
    >
      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          {TICKET_TYPE_LABELS[loadedTicket.type]} · {loadedTicket.key}
        </p>
        <h1 id={headingId} className="text-2xl font-semibold">
          Edit ticket
        </h1>
      </header>
      {/* At the top, where the conflict banner of CON-1 goes (wireframe 04 C). */}
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      {/* Title and description on the left; from 768px up the other fields move to the right,
          where the details panel is in view mode (wireframe 04 B). */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start md:gap-6">
        <div className="grid gap-4">
          <TicketTitleField
            registration={register('title')}
            error={errors.title?.message}
            length={title.length}
          />
          <TicketDescriptionField
            registration={register('description')}
            error={errors.description?.message}
            rows={8}
          />
        </div>
        <div className="grid gap-4 md:rounded-lg md:border md:p-4">
          <TicketChoiceField
            label="Status"
            labels={STATUS_LABELS}
            registration={register('status')}
            error={errors.status?.message}
          />
          <Controller
            control={control}
            name="assigneeId"
            render={({ field }) => (
              <AssigneeField
                label="Assigned to"
                projectKey={projectKey}
                value={field.value ?? null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                selectRef={field.ref}
                error={errors.assigneeId?.message}
                currentAssignee={loadedTicket.assignee}
              />
            )}
          />
          <TicketChoiceField
            label="Priority"
            labels={PRIORITY_LABELS}
            registration={register('priority')}
            error={errors.priority?.message}
          />
          <TicketChoiceField
            label="Type"
            labels={TICKET_TYPE_LABELS}
            registration={register('type')}
            error={errors.type?.message}
          />
          <TicketDueDateField
            registration={register('dueDate', { setValueAs: emptyToNull })}
            error={errors.dueDate?.message}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {/* Disabled while saving, so a double click can't send the same edit twice. */}
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2Icon aria-hidden="true" className="motion-safe:animate-spin" />}
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
