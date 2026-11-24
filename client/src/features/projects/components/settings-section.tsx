import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  /** Extra classes for the frame, such as the danger zone's red border. */
  className?: string;
}

/** One framed section of the project settings page, named by its heading (wireframe 06 A). */
export function SettingsSection({
  title,
  children,
  className,
}: SettingsSectionProps): ReactElement {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      <div className={cn('rounded-lg border p-4 sm:p-6', className)}>{children}</div>
    </section>
  );
}
