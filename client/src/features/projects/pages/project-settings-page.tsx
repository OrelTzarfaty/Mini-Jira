import type { ReactElement } from 'react';

import { PlaceholderPage } from '@/components/placeholder-page';
import { useRouteParam } from '@/lib/use-route-param';

// TODO(PRJ-3): build the project settings from wireframe 06.
export function ProjectSettingsPage(): ReactElement {
  const projectKey = useRouteParam('projectKey');

  return <PlaceholderPage title={`${projectKey} settings`} />;
}
