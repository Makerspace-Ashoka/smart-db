import type { Toast as ToastData } from "../hooks/useToasts";

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span>{toast.message}</span>
          {toast.type === "error" ? (
            <button type="button" onClick={() => onDismiss(toast.id)}>
              Dismiss
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
