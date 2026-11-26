import { useEffect, useState } from 'react';

// Long enough to read the key; the board shows the result anyway, so nothing is lost after.
const MESSAGE_DURATION_MS = 6000;

interface TicketMessage {
  /** The key the message is about, such as WEB-13; null while no message shows. */
  ticketKey: string | null;
  show: (ticketKey: string) => void;
  dismiss: () => void;
}

/**
 * The state behind the short "WEB-13 created" / "WEB-12 deleted" messages (wireframes 03 E and
 * 04 D): shown on demand and hidden again after a few seconds.
 */
export function useTicketMessage(): TicketMessage {
  const [ticketKey, setTicketKey] = useState<string | null>(null);

  // A timer is outside React, so an effect syncs with it. A new key restarts the timer.
  useEffect(() => {
    if (ticketKey === null) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setTicketKey(null);
    }, MESSAGE_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ticketKey]);

  return {
    ticketKey,
    // The state setter, so it never changes and an effect may depend on it.
    show: setTicketKey,
    dismiss: () => {
      setTicketKey(null);
    },
  };
}
