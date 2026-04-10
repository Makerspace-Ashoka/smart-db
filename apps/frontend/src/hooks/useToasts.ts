import { useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 4000;
let nextId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `toast-${++nextId}`;
      let dedupedId: string | null = null;
      setToasts((current) => {
        const existing = current.find(
          (toast) => toast.message === message && toast.type === type,
        );
        if (existing) {
          dedupedId = existing.id;
          return current;
        }

        return [...current, { id, message, type }];
      });

      if (dedupedId) {
        return dedupedId;
      }

      if (type === "success") {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, AUTO_DISMISS_MS);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return { toasts, addToast, dismissToast };
}
