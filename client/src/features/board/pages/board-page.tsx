import type { ReactElement } from 'react';

import { PlaceholderPage } from '@/components/placeholder-page';
import { useRouteParam } from '@/lib/use-route-param';

// TODO(BRD-1): build the board from wireframe 03.
export function BoardPage(): ReactElement {
  const projectKey = useRouteParam('projectKey');

  return <PlaceholderPage title={`${projectKey} board`} />;
}
