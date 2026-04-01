import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastContainer } from "./Toast";

describe("ToastContainer", () => {
  it("renders nothing when empty", () => {
    const { container } = render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders success toast with status role", () => {
    render(
      <ToastContainer
        toasts={[{ id: "1", message: "Done!", type: "success" }]}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Done!");
  });

  it("renders error toast with alert role and dismiss button", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ToastContainer
        toasts={[{ id: "2", message: "Oops!", type: "error" }]}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Oops!");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledWith("2");
  });
});
