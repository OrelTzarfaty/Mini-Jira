import type { ReactElement } from 'react';

import { PlaceholderPage } from '@/components/placeholder-page';
import { useRouteParam } from '@/lib/use-route-param';

// TODO(TKT-2): build the ticket page from wireframe 04.
export function TicketPage(): ReactElement {
  const ticketKey = useRouteParam('ticketKey');

  return <PlaceholderPage title={ticketKey} />;
}
