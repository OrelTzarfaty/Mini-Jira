import { TriangleAlertIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  /** What failed, in plain words: "Couldn't load your projects." */
  message: string;
  /** Shows a "Try again" button that calls this function. */
  onRetry?: () => void;
}

/** Shown when a data view failed to load. */
export function ErrorState({ message, onRetry }: ErrorStateProps): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center"
    >
      <p className="flex items-center gap-2 font-medium">
        {/* The wireframes keep red for destructive actions and overdue dates only. */}
        <TriangleAlertIcon aria-hidden="true" className="size-5 shrink-0" />
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
