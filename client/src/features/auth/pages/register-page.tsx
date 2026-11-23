import { useRef } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { RegisterForm } from '@/features/auth/components/register-form';

// On a phone the popup fills the whole screen (wireframe 01 D); from 640px it is the usual
// centered card.
const FULL_SCREEN_ON_PHONE =
  'top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl';

/**
 * /register: the landing page (the parent route) with the Register popup open (wireframe 01 C).
 * The URL owns the open state, so the popup can be linked to and Back closes it. ✕, Esc, and a
 * click on the dimmed page close it by going back to /. The landing page stays mounted, so
 * focus can return to the link that opened the popup.
 */
export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  // Radix returns focus to a DialogTrigger, but links open this popup, so remember what had
  // focus when it opened (standards §9: focus returns on close).
  const openerRef = useRef<HTMLElement | null>(null);

  function rememberOpener(): void {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function returnFocusToOpener(event: Event): void {
    event.preventDefault();
    openerRef.current?.focus();
  }

  function handleOpenChange(isOpen: boolean): void {
    if (!isOpen) {
      // replace: the closed popup isn't a page of its own, so Back shouldn't reopen it.
      void navigate('/', { replace: true });
    }
  }

  return (
    <>
      <DocumentTitle title="Create your account" />
      <Dialog open onOpenChange={handleOpenChange}>
        {/* The form's labels describe it, so the popup needs no separate description. */}
        <DialogContent
          aria-describedby={undefined}
          onOpenAutoFocus={rememberOpener}
          onCloseAutoFocus={returnFocusToOpener}
          className={FULL_SCREEN_ON_PHONE}
        >
          <DialogTitle className="pr-8">Create your account</DialogTitle>
          <RegisterForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
