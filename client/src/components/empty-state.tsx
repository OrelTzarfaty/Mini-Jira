import type { ReactElement, ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** A decorative icon above the title. */
  icon?: ReactNode;
  /** The next step, usually a button such as "Create project". */
  action?: ReactNode;
}

/** Shown when a data view loaded successfully but has nothing to show yet. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {icon && (
        <div aria-hidden="true" className="text-muted-foreground [&_svg]:size-10">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
