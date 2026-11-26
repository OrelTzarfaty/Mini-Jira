import { useEffect, useState } from 'react';

/**
 * A value that clears itself (back to null) a while after it is set, such as a short "Link
 * copied" or "Changes saved" message. A timer is outside React, so an effect syncs with it; a new
 * value restarts the timer.
 */
export function useAutoClearState<T>(durationMs: number): [T | null, (value: T | null) => void] {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (value === null) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setValue(null);
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, durationMs]);

  return [value, setValue];
}
