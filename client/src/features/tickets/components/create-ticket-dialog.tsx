import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateTicketForm } from '@/features/tickets/components/create-ticket-form';

/**
 * The "+ Create ticket" button in the project header and its popup (wireframe 03 A, E, H;
 * TKT-1). Every member may create tickets, so it shows for everyone who can see the project.
 * The form lives inside the popup's content, so closing it (Cancel, ✕, Esc) throws away what
 * was typed, and Radix returns focus to the button.
 */
export function CreateTicketDialog({ projectKey }: { projectKey: string }): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

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
      >
        <DialogTitle className="pr-8">Create ticket in {projectKey}</DialogTitle>
        <CreateTicketForm
          projectKey={projectKey}
          onCreated={() => {
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
