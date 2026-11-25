import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTicketSchema,
  Priority,
  TICKET_TITLE_MAX_LENGTH,
  TicketType,
} from '@mini-jira/shared';
import type { CreateTicketInput, Ticket } from '@mini-jira/shared';
import { Loader2Icon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTicketMutation } from '@/features/tickets/hooks/use-create-ticket-mutation';
import { PRIORITY_LABELS, TICKET_TYPE_LABELS } from '@/features/tickets/lib/ticket-labels';
import { showServerError } from '@/lib/show-server-error';

// The form's field names, from the shared schema, to match the server's details[].field.
const CREATE_TICKET_FIELDS = createTicketSchema.keyof().options;

/** A cleared date field gives "", which the API takes as no due date only when sent as null. */
function emptyToNull(value: string | null): string | null {
  return value === '' ? null : value;
}

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
      {/* No maxLength: a long paste isn't cut silently; the counter and the error show it. */}
      <FormField
        label="Title"
        hint={`${String(title.length)} / ${String(TICKET_TITLE_MAX_LENGTH)}`}
        error={errors.title?.message}
      >
        {(fieldControl) => <Input {...fieldControl} {...register('title')} autoComplete="off" />}
      </FormField>
      <FormField label="Description (optional)" error={errors.description?.message}>
        {(fieldControl) => <Textarea {...fieldControl} {...register('description')} rows={4} />}
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Type" error={errors.type?.message}>
          {(fieldControl) => (
            <NativeSelect {...fieldControl} {...register('type')} className="w-full">
              {Object.values(TicketType).map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {TICKET_TYPE_LABELS[type]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Priority" error={errors.priority?.message}>
          {(fieldControl) => (
            <NativeSelect {...fieldControl} {...register('priority')} className="w-full">
              {Object.values(Priority).map((priority) => (
                <NativeSelectOption key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        {/* The browser's own date picker: keyboard and screen reader friendly, the phone's
            native picker, and its value is already the calendar day "YYYY-MM-DD" in the user's
            own calendar, with no time or time zone that could shift it by a day. */}
        <FormField label="Due date (optional)" error={errors.dueDate?.message}>
          {(fieldControl) => (
            <Input
              {...fieldControl}
              {...register('dueDate', { setValueAs: emptyToNull })}
              type="date"
            />
          )}
        </FormField>
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
