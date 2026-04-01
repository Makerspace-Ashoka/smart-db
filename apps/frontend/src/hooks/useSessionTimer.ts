import { useEffect, useState } from "react";

const WARNING_THRESHOLD_MINUTES = 5;

interface SessionTimerResult {
  minutesRemaining: number | null;
  isExpiringSoon: boolean;
}

export function useSessionTimer(expiresAt: string | null): SessionTimerResult {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setMinutesRemaining(null);
      return;
    }

    function update() {
      const remaining = (new Date(expiresAt!).getTime() - Date.now()) / 60_000;
      setMinutesRemaining(Math.max(0, Math.round(remaining)));
    }

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    minutesRemaining,
    isExpiringSoon:
      minutesRemaining !== null && minutesRemaining <= WARNING_THRESHOLD_MINUTES,
  };
}
