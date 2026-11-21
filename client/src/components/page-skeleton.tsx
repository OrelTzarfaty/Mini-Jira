import type { ReactElement } from 'react';

const PLACEHOLDER_CARD_COUNT = 3;

interface PageSkeletonProps {
  /** Read by screen readers instead of the grey shapes: "Loading your projects". */
  label?: string;
}

/** Grey placeholder shapes shown while a page loads its data. */
export function PageSkeleton({ label = 'Loading' }: PageSkeletonProps): ReactElement {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PLACEHOLDER_CARD_COUNT }, (_, index) => (
            <div key={index} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
