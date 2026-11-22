import { TriangleAlertIcon } from 'lucide-react';
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

/** The attributes that tie a form control to its label, hint, and error. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  label: string;
  /** Always-visible help under the control, such as "At least 8 characters". */
  hint?: string;
  /** The field's error, shown under the control (and under the hint). */
  error?: string;
  /** Renders the control with the given props spread onto it. */
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * A label, a control, and its hint and error (standards §9): the label names the control, and
 * the hint and error are linked with aria-describedby, so a screen reader reads them with it.
 */
export function FormField({ label, hint, error, children }: FormFieldProps): ReactElement {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm">
          {/* Ink and an icon, not red: DESIGN.md keeps red for destructive actions and overdue
              dates until the owner decides whether form errors may use it. */}
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
