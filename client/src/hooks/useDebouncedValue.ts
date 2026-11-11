import { useEffect, useState } from "react";

/** Returns `value` delayed by `delayMs`, resetting the timer on each change.
 *  Used to throttle search-as-you-type queries. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
