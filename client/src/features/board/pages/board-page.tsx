import type { ReactElement } from 'react';

import { PlaceholderPage } from '@/components/placeholder-page';
import { TicketDeletedMessage } from '@/features/tickets/components/ticket-deleted-message';
import { useRouteParam } from '@/lib/use-route-param';

// TODO(BRD-1): build the board from wireframe 03.
export function BoardPage(): ReactElement {
  const projectKey = useRouteParam('projectKey');

  return (
    <>
      <PlaceholderPage title={`${projectKey} board`} />
      {/* "WEB-12 deleted" after deleting a ticket on its page (TKT-4). */}
      <TicketDeletedMessage />
    </>
  );
}
