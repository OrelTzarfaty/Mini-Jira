import { zodResolver } from '@hookform/resolvers/zod';
import { updateTicketSchema } from '@mini-jira/shared';
import type { Ticket, UpdateTicketInput } from '@mini-jira/shared';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  TicketChoiceField,
  TicketDescriptionField,
  TicketDueDateField,
  TicketTitleField,
} from '@/features/tickets/components/ticket-form-fields';
import { emptyToNull } from '@/features/tickets/lib/empty-to-null';
import { ticketChanges } from '@/features/tickets/lib/ticket-changes';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from '@/features/tickets/lib/ticket-labels';

interface EditTicketFormProps {
  ticket: Ticket;
  /** Back to view mode without saving. */
  onCancel: () => void;
}

/**
 * The ticket page's edit mode (wireframe 04 B, TKT-3): title and description on the left, status,
 * priority, type, and due date on the right. The shared updateTicketSchema checks it. The assignee
 * comes with TKT-5; the estimate waits for the mentor's OK (DOC-5).
 */
export function EditTicketForm({ ticket, onCancel }: EditTicketFormProps): ReactElement {
  // The ticket as it was when Edit was clicked: the version this edit is based on. A background
  // refresh may bring a newer one, but the form must keep comparing with, and later send the
  // updatedAt of, the version the user started from (CON-1).
  const [loadedTicket] = useState(ticket);
  const headingId = useId();
  const {
    register,
    control,
    handleSubmit,
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
    },
  });
  const title = useWatch({ control, name: 'title' }) ?? '';

  // Edit moves focus into the form, to the first field (the button that opened it is gone).
  useEffect(() => {
    setFocus('title');
  }, [setFocus]);

  // Gets the schema's output: trimmed, an empty description as null.
  function handleValidSubmit(edited: UpdateTicketInput): void {
    if (ticketChanges(loadedTicket, edited) === null) {
      // Nothing changed: nothing to save.
      onCancel();
    }
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
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
