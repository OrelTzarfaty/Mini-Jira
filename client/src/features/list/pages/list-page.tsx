import type { ReactElement } from 'react';

import { PlaceholderPage } from '@/components/placeholder-page';
import { useRouteParam } from '@/lib/use-route-param';

// TODO(LST-1): build the list view from wireframe 05.
export function ListPage(): ReactElement {
  const projectKey = useRouteParam('projectKey');

  return <PlaceholderPage title={`${projectKey} list`} />;
}
