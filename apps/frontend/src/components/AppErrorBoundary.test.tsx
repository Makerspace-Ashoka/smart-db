import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error occurs", () => {
    render(
      <AppErrorBoundary>
        <div>Healthy app</div>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Healthy app")).toBeInTheDocument();
  });

  it("shows a recovery UI and reloads the page after a render crash", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload },
      configurable: true,
    });

    function Broken() {
      throw new Error("boom");
    }

    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Smart DB hit an unexpected error")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reload Smart DB" }));
    expect(reload).toHaveBeenCalled();
  });
});
