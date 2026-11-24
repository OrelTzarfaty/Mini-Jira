import { PlusIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateProjectForm } from '@/features/projects/components/create-project-form';

/**
 * The "+ Create project" button and its popup (wireframe 02 B, D, H; PRJ-1). Radix returns focus
 * to the button when the popup closes. The form lives inside the popup's content, so closing it
 * (Cancel, ✕, Esc) throws away what was typed and the next open starts empty.
 */
export function CreateProjectDialog(): ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* On a phone only the (+) shows (wireframe 02 H); the label stays as the button's
            accessible name, so screen readers still hear "Create project". */}
        <Button className="size-8 shrink-0 px-0 sm:w-auto sm:px-2.5">
          <PlusIcon aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Create project</span>
        </Button>
      </DialogTrigger>
      {/* The form's labels and hints describe it, so the popup needs no separate description.
          max-h + scroll: on a short phone screen the footer stays reachable. */}
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        <DialogTitle className="pr-8">Create project</DialogTitle>
        <CreateProjectForm />
      </DialogContent>
    </Dialog>
  );
}
