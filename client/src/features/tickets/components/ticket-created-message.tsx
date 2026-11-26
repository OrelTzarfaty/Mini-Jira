import { CircleCheckIcon, XIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';

interface TicketCreatedMessageProps {
  /** The new ticket's key, such as WEB-13; null shows nothing. */
  ticketKey: string | null;
  onDismiss: () => void;
}

/**
 * The short "WEB-13 created" message after Create (wireframe 03 E), in the bottom corner where
 * the board's other messages go (wireframe 03 C). The status paragraph is always in the page, so
 * screen readers announce the message as soon as it appears (WCAG 4.1.3); the Dismiss button
 * sits outside it, so they hear only "WEB-13 created".
 */
export function TicketCreatedMessage({
  ticketKey,
  onDismiss,
}: TicketCreatedMessageProps): ReactElement {
  const isShown = ticketKey !== null;

  return (
    // pointer-events-none: clicks pass through the empty space around the message.
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-6">
      <div
        className={
          isShown
            ? 'pointer-events-auto flex items-center gap-2 rounded-xl bg-popover py-2 pr-2 pl-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2'
            : undefined
        }
      >
        <p role="status" className="flex items-center gap-2">
          {isShown && (
            <>
              <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>
                <strong className="font-semibold">{ticketKey}</strong> created
              </span>
            </>
          )}
        </p>
        {isShown && (
          <Button variant="ghost" size="icon-sm" onClick={onDismiss}>
            <XIcon aria-hidden="true" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  );
}
