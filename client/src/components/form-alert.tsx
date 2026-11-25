import { TriangleAlertIcon } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * A form's error that belongs to no single field, such as "Email or password is incorrect".
 * role="alert" makes screen readers announce it as soon as it appears.
 */
export function FormAlert({ message }: { message: string }): ReactElement {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border p-3 text-sm">
      {/* Ink and an icon, like ErrorState: nothing was destroyed. */}
      <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
