import { useEffect, useState } from 'react';

/**
 * The value once it has stopped changing for `delayMs`, so a search box asks the server after
 * the user pauses typing, not on every key press. A timer is outside React, hence the effect.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
