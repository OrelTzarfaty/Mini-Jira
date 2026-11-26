import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { TicketMessage } from '@/features/tickets/components/ticket-message';
import { useTicketMessage } from '@/features/tickets/hooks/use-ticket-message';
import { deletedTicketKeyFrom } from '@/features/tickets/lib/deleted-ticket';

/**
 * "WEB-12 deleted" on the board after the ticket page deleted a ticket (TKT-4, wireframe 04 D).
 * The key comes in the history entry's state; it is shown, then cleared from the entry, so a
 * reload or Back doesn't say it again.
 */
export function TicketDeletedMessage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const message = useTicketMessage();
  const deletedTicketKey = deletedTicketKeyFrom(location.state);
  const { show } = message;

  // The browser's history is outside React: this effect reads the entry's state once and clears
  // it. The key is shown from here, after the first render, so the status region is already in
  // the page and screen readers announce the change (WCAG 4.1.3).
  useEffect(() => {
    if (deletedTicketKey !== undefined) {
      show(deletedTicketKey);
      void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [deletedTicketKey, location.pathname, location.search, navigate, show]);

  return (
    <TicketMessage ticketKey={message.ticketKey} action="deleted" onDismiss={message.dismiss} />
  );
}
