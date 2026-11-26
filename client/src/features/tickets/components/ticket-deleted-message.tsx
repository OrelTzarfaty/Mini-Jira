import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { ToastMessage } from '@/components/toast-message';
import { deletedTicketKeyFrom } from '@/features/tickets/lib/deleted-ticket';
import { useAutoClearState } from '@/lib/use-auto-clear-state';

// Long enough to read the key, as "WEB-13 created".
const DELETED_MESSAGE_DURATION_MS = 6000;

/**
 * "WEB-12 deleted" on the board after the ticket page deleted a ticket (TKT-4, wireframe 04 D).
 * The key comes in the history entry's state; it is shown, then cleared from the entry, so a
 * reload or Back doesn't say it again.
 */
export function TicketDeletedMessage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const [shownTicketKey, setShownTicketKey] = useAutoClearState<string>(
    DELETED_MESSAGE_DURATION_MS,
  );
  const deletedTicketKey = deletedTicketKeyFrom(location.state);

  // The browser's history is outside React: this effect reads the entry's state once and clears
  // it. The key is shown from here, after the first render, so the status region is already in
  // the page and screen readers announce the change (WCAG 4.1.3).
  useEffect(() => {
    if (deletedTicketKey !== undefined) {
      setShownTicketKey(deletedTicketKey);
      void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [deletedTicketKey, location.pathname, location.search, navigate, setShownTicketKey]);

  return (
    <ToastMessage
      message={
        shownTicketKey && (
          <>
            <strong className="font-semibold">{shownTicketKey}</strong> deleted
          </>
        )
      }
      onDismiss={() => {
        setShownTicketKey(null);
      }}
    />
  );
}
