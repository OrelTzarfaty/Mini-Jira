import { TICKET_TITLE_MAX_LENGTH } from '@mini-jira/shared';
import type { ReactElement } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

// The ticket fields that the Create ticket popup (TKT-1) and the ticket page's edit mode (TKT-3)
// share, so both show the same labels, counter, and controls. Each one takes what
// react-hook-form's register() returns, so it works with either form's values.

interface TicketFieldProps {
  registration: UseFormRegisterReturn;
  error: string | undefined;
}

/** The title with its "45 / 120" counter (wireframes 03 E and 04 B). */
export function TicketTitleField({
  registration,
  error,
  length,
}: TicketFieldProps & { length: number }): ReactElement {
  return (
    // No maxLength: a long paste isn't cut silently; the counter and the error show it.
    <FormField
      label="Title"
      hint={`${String(length)} / ${String(TICKET_TITLE_MAX_LENGTH)}`}
      error={error}
    >
      {(fieldControl) => <Input {...fieldControl} {...registration} autoComplete="off" />}
    </FormField>
  );
}

export function TicketDescriptionField({
  registration,
  error,
  rows = 4,
}: TicketFieldProps & { rows?: number }): ReactElement {
  return (
    <FormField label="Description (optional)" error={error}>
      {(fieldControl) => <Textarea {...fieldControl} {...registration} rows={rows} />}
    </FormField>
  );
}

/** A menu of one of the ticket's fixed choices (type, priority, status), in the labels' order. */
export function TicketChoiceField<T extends string>({
  label,
  labels,
  registration,
  error,
}: TicketFieldProps & { label: string; labels: Record<T, string> }): ReactElement {
  return (
    <FormField label={label} error={error}>
      {(fieldControl) => (
        <NativeSelect {...fieldControl} {...registration} className="w-full">
          {Object.entries<string>(labels).map(([value, text]) => (
            <NativeSelectOption key={value} value={value}>
              {text}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}

/**
 * The browser's own date picker: keyboard and screen reader friendly, the phone's native picker,
 * and its value is already the calendar day "YYYY-MM-DD" in the user's own calendar, with no time
 * or time zone that could shift it by a day. The registration must turn "" into null
 * (setValueAs: emptyToNull from lib/empty-to-null).
 */
export function TicketDueDateField({ registration, error }: TicketFieldProps): ReactElement {
  return (
    <FormField label="Due date (optional)" error={error}>
      {(fieldControl) => <Input {...fieldControl} {...registration} type="date" />}
    </FormField>
  );
}
