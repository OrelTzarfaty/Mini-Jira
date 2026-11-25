import { Loader2Icon } from 'lucide-react';
import { useRef } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';

import { FormAlert } from '@/components/form-alert';

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
  /** Anything the user must do before confirming, such as typing the project key (PRJ-5). */
  children?: ReactNode;
  /** Keeps the destructive button disabled, for example until the project key is typed. */
  isConfirmDisabled?: boolean;
  /** The destructive button's text, for example "Delete ticket". */
  confirmLabel: string;
  onConfirm: () => void;
  /** While the action is being sent: the destructive button is disabled and shows a spinner. */
  isPending?: boolean;
  /** The destructive button's text while sending, for example "Removing…". */
  pendingLabel?: string;
  /** Why the action failed, shown in the dialog so the user can try again or cancel. */
  error?: string;
  /**
   * Where focus goes after closing when the button that opened the dialog is gone, for example
   * because the action removed its row.
   */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
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
  children,
  isConfirmDisabled = false,
  confirmLabel,
  onConfirm,
  isPending = false,
  pendingLabel = confirmLabel,
  error,
  fallbackFocusRef,
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
    const opener = openerRef.current;

    if (opener?.isConnected) {
      opener.focus();
    } else {
      fallbackFocusRef?.current?.focus();
    }
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
        {children}
        {error && <FormAlert message={error} />}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {/* Disabled while sending, so a double click can't send the action twice. */}
          <Button
            variant="destructive"
            disabled={isPending || isConfirmDisabled}
            onClick={onConfirm}
          >
            {isPending && <Loader2Icon aria-hidden="true" className="animate-spin" />}
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
