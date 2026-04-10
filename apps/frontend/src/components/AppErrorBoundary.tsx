import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // React already logs the error in development. This boundary exists to preserve a recoverable UI.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="shell">
          <section className="panel">
            <h1>Smart DB hit an unexpected error</h1>
            <p className="lede">Reload the app to recover. If this keeps happening, report the last action you took.</p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
            >
              Reload Smart DB
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
