import { PlusIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { ToastMessage } from '@/components/toast-message';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateTicketForm } from '@/features/tickets/components/create-ticket-form';
import { useAutoClearState } from '@/lib/use-auto-clear-state';

// Long enough to read the key; the board shows the new card anyway, so nothing is lost after.
const CREATED_MESSAGE_DURATION_MS = 6000;

/**
 * The "+ Create ticket" button in the project header and its popup (wireframe 03 A, E, H;
 * TKT-1). Every member may create tickets, so it shows for everyone who can see the project.
 * The form lives inside the popup's content, so closing it (Cancel, ✕, Esc) throws away what
 * was typed, and Radix returns focus to the button. After Create, "WEB-13 created" shows.
 */
export function CreateTicketDialog({ projectKey }: { projectKey: string }): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  // Hides "WEB-13 created" after a few seconds; a new ticket's key restarts the timer.
  const [createdTicketKey, setCreatedTicketKey] = useAutoClearState<string>(
    CREATED_MESSAGE_DURATION_MS,
  );
  // The new key waits here until the popup has fully closed: while it is open, Radix hides the
  // rest of the page from screen readers (aria-hidden), and a message that appears there then
  // isn't announced. Only event handlers read it, so a ref is enough.
  const keyToAnnounceRef = useRef<string | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* On a phone only the (+) shows (wireframe 03 H); the label stays as the button's
            accessible name, so screen readers still hear "Create ticket". */}
        <Button className="size-8 shrink-0 px-0 sm:w-auto sm:px-2.5">
          <PlusIcon aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Create ticket</span>
        </Button>
      </DialogTrigger>
      {/* The form's labels describe it, so the popup needs no separate description.
          max-h + scroll: on a short phone screen the footer stays reachable. */}
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={() => {
          // Runs after the popup is gone and the page is visible to screen readers again.
          if (keyToAnnounceRef.current !== null) {
            createdMessage.show(keyToAnnounceRef.current);
            keyToAnnounceRef.current = null;
          }
        }}
      >
        <DialogTitle className="pr-8">Create ticket in {projectKey}</DialogTitle>
        <CreateTicketForm
          projectKey={projectKey}
          onCreated={(ticket) => {
            keyToAnnounceRef.current = ticket.key;
            setIsOpen(false);
          }}
        />
      </DialogContent>
      <ToastMessage
        message={
          createdTicketKey && (
            <>
              <strong className="font-semibold">{createdTicketKey}</strong> created
            </>
          )
        }
        onDismiss={() => {
          setCreatedTicketKey(null);
        }}
      />
    </Dialog>
  );
}
