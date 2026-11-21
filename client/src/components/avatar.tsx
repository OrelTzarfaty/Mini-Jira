import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

interface AvatarProps {
  /** The person's full name: shown as initials and read in full by screen readers. */
  name: string;
  className?: string;
}

// "Dana Levi" → "DL", "Mary Ann Smith" → "MS", "Dana" → "D".
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const firstWord = words[0] ?? '';
  const lastWord = words.length > 1 ? (words.at(-1) ?? '') : '';

  // Array.from splits by character, so a letter made of two UTF-16 units stays whole.
  const initials = [firstWord, lastWord].map((word) => Array.from(word)[0] ?? '');

  return initials.join('').toUpperCase();
}

/** A person's initials in a circle (BRD-1 card assignee, member lists). */
export function Avatar({ name, className }: AvatarProps): ReactElement {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground select-none',
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
