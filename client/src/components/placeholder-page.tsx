import type { ReactElement } from 'react';

import { DocumentTitle } from '@/components/document-title';

/** Stands in for a screen until its feature mission builds it. */
export function PlaceholderPage({ title }: { title: string }): ReactElement {
  return (
    <>
      <DocumentTitle title={title} />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">This page isn&apos;t built yet.</p>
    </>
  );
}
