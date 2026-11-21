import type { ReactElement } from 'react';

const APP_NAME = 'Mini-Jira';

/** Sets the browser tab title to "<title> · Mini-Jira". React moves the element into <head>. */
export function DocumentTitle({ title }: { title: string }): ReactElement {
  return <title>{`${title} · ${APP_NAME}`}</title>;
}
