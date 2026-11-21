import { useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question, for example "Delete WEB-12?" */
  title: string;
  /** What will happen, for example "This can't be undone." */
  description: ReactNode;
  /** The destructive button's text, for example "Delete ticket". */
  confirmLabel: string;
  onConfirm: () => void;
}

/**
 * Asks the user to confirm a destructive action (delete, remove member).
 *
 * The parent controls `open`, so the dialog can be opened from a button or a menu item.
 * Confirming doesn't close the dialog: the parent closes it when the action is done,
 * so a failed delete can keep it open. Escape and "Cancel" close it.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps): ReactElement {
  const openerRef = useRef<HTMLElement | null>(null);

  // Radix returns focus to its own Trigger, and this dialog has none. Remember what had
  // focus when the dialog opened and return focus there when it closes (WCAG 2.4.3).
  function handleOpenAutoFocus(): void {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function handleCloseAutoFocus(event: Event): void {
    event.preventDefault();
    openerRef.current?.focus();
  }

  return (
    // An alert dialog focuses "Cancel" first and ignores clicks outside it, so a
    // destructive action never happens by accident.
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
