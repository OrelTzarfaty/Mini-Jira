import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateProjectForm } from '@/features/projects/components/create-project-form';

/**
 * The popup's frame and form. The form lives inside the popup's content, so closing it (Cancel,
 * ✕, Esc) throws away what was typed and the next open starts empty.
 */
function CreateProjectDialogContent({
  onCreated,
  onCloseAutoFocus,
}: {
  onCreated: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}): ReactElement {
  return (
    // The form's labels and hints describe it, so the popup needs no separate description.
    // max-h + scroll: on a short phone screen the footer stays reachable.
    <DialogContent
      aria-describedby={undefined}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <DialogTitle className="pr-8">Create project</DialogTitle>
      <CreateProjectForm onCreated={onCreated} />
    </DialogContent>
  );
}

/**
 * The "+ Create project" button and its popup (wireframe 02 B, C, D, H; PRJ-1). Radix returns
 * focus to the button when the popup closes.
 */
export function CreateProjectDialog(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* On a phone only the (+) shows (wireframe 02 H); the label stays as the button's
            accessible name, so screen readers still hear "Create project". */}
        <Button className="size-8 shrink-0 px-0 sm:w-auto sm:px-2.5">
          <PlusIcon aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Create project</span>
        </Button>
      </DialogTrigger>
      <CreateProjectDialogContent
        onCreated={() => {
          setIsOpen(false);
        }}
      />
    </Dialog>
  );
}

interface CreateProjectPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Where focus goes when the popup closes, since it has no button of its own to go back to. */
  onCloseAutoFocus: (event: Event) => void;
}

/**
 * The same popup without its own button, for a caller that opens it from somewhere else: the
 * project dropdown's "+ Create project" (wireframe 02 E), which is gone once the dropdown closes.
 */
export function CreateProjectPopup({
  isOpen,
  onOpenChange,
  onCloseAutoFocus,
}: CreateProjectPopupProps): ReactElement {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <CreateProjectDialogContent
        onCreated={() => {
          onOpenChange(false);
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      />
    </Dialog>
  );
}
