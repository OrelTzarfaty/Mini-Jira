import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketSchema, Priority, TicketType } from '@mini-jira/shared';
import type { CreateTicketInput, Ticket } from '@mini-jira/shared';
import { Loader2Icon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import {
  TicketChoiceField,
  TicketDescriptionField,
  TicketDueDateField,
  TicketTitleField,
} from '@/features/tickets/components/ticket-form-fields';
import { emptyToNull } from '@/features/tickets/lib/empty-to-null';
import { useCreateTicketMutation } from '@/features/tickets/hooks/use-create-ticket-mutation';
import { PRIORITY_LABELS, TICKET_TYPE_LABELS } from '@/features/tickets/lib/ticket-labels';
import { showServerError } from '@/lib/show-server-error';

// The form's field names, from the shared schema, to match the server's details[].field.
const CREATE_TICKET_FIELDS = createTicketSchema.keyof().options;

interface CreateTicketFormProps {
  projectKey: string;
  /** Closes the popup and shows "WEB-13 created". */
  onCreated: (ticket: Ticket) => void;
}

/**
 * The Create ticket form (wireframe 03 E, TKT-1). The shared createTicketSchema checks it, and
 * the server's field errors show under the same fields. The assignee comes with TKT-5; the
 * estimate waits for the mentor's OK (DOC-5).
 */
export function CreateTicketForm({ projectKey, onCreated }: CreateTicketFormProps): ReactElement {
  const createTicketMutation = useCreateTicketMutation(projectKey);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createTicketSchema),
    // The defaults the wireframe shows: Task, Medium.
    defaultValues: {
      title: '',
      description: '',
      type: TicketType.TASK,
      priority: Priority.MEDIUM,
      dueDate: null,
    },
  });
  const title = useWatch({ control, name: 'title' });
  const isSending = createTicketMutation.isPending;

  // Gets the schema's output: trimmed, an empty description as null.
  function handleValidSubmit(input: CreateTicketInput): void {
    createTicketMutation.mutate(input, {
      onSuccess: onCreated,
      onError: (error) => {
        showServerError(error, setError, { fields: CREATE_TICKET_FIELDS });
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
      <TicketTitleField
        registration={register('title')}
        error={errors.title?.message}
        length={title.length}
      />
      <TicketDescriptionField
        registration={register('description')}
        error={errors.description?.message}
      />
      <div className="grid grid-cols-2 gap-4">
        <TicketChoiceField
          label="Type"
          labels={TICKET_TYPE_LABELS}
          registration={register('type')}
          error={errors.type?.message}
        />
        <TicketChoiceField
          label="Priority"
          labels={PRIORITY_LABELS}
          registration={register('priority')}
          error={errors.priority?.message}
        />
        <TicketDueDateField
          registration={register('dueDate', { setValueAs: emptyToNull })}
          error={errors.dueDate?.message}
        />
      </div>
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        {/* Disabled while sending, so a double click can't create the ticket twice. */}
        <Button type="submit" disabled={isSending}>
          {isSending && <Loader2Icon aria-hidden="true" className="motion-safe:animate-spin" />}
          {isSending ? 'Creating…' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
