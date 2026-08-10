import { useEffect, useRef, useState } from 'react';

/**
 * Eases a number from 0 to `target` once the value is known. Reproduces the
 * dashboards' "statistics count up on reveal" behaviour, and respects the
 * reduced-motion preference by snapping straight to the target.
 */
export function useCountUp(target, { duration = 900, enabled = true, decimals = 0 } = {}) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frame = useRef(0);

  useEffect(() => {
    if (!enabled || target == null) {
      setValue(target ?? 0);
      return undefined;
    }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return undefined;
    }

    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Number((target * eased).toFixed(decimals)));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, enabled, decimals]);

  return value;
}
