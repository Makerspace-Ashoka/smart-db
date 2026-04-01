import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled: boolean,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        callbackRef.current();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, enabled]);
}
