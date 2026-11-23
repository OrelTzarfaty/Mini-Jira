import type { ReactElement, ReactNode, RefObject } from 'react';
import { useNavigate, useOutletContext } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// On a phone the popup fills the whole screen (wireframe 01 D); from 640px it is the usual
// centered card.
const FULL_SCREEN_ON_PHONE =
  'top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl';

interface AuthPopupProps {
  /** The popup's heading, which also names the dialog for screen readers. */
  title: string;
  /** The browser tab title. */
  tabTitle: string;
  /** The form. */
  children: ReactNode;
}

/**
 * The Log in and Register popups over the landing page (wireframe 01 B and C, AUTH-1/AUTH-2).
 * The URL owns the open state, so a popup can be linked to and Back closes it. ✕, Esc, and a
 * click on the dimmed page close it by going back to /. The landing page stays mounted, so
 * focus can return to the link that opened the popup. It must render in the landing page's
 * Outlet, which passes the ref that remembers that link.
 */
export function AuthPopup({ title, tabTitle, children }: AuthPopupProps): ReactElement {
  const navigate = useNavigate();
  // Radix returns focus to a DialogTrigger, but links open these popups, so remember what had
  // focus when one opened (standards §9: focus returns on close).
  const openerRef = useOutletContext<RefObject<HTMLElement | null>>();

  function rememberOpener(): void {
    const focused = document.activeElement;

    // After a switch from the other popup, the link that switched is gone and focus is on the
    // page body: keep the element that opened the first popup.
    if (focused instanceof HTMLElement && focused.isConnected && focused !== document.body) {
      openerRef.current = focused;
    }
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
      <DocumentTitle title={tabTitle} />
      <Dialog open onOpenChange={handleOpenChange}>
        {/* The form's labels describe it, so the popup needs no separate description. */}
        <DialogContent
          aria-describedby={undefined}
          onOpenAutoFocus={rememberOpener}
          onCloseAutoFocus={returnFocusToOpener}
          className={FULL_SCREEN_ON_PHONE}
        >
          <DialogTitle className="pr-8">{title}</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}
