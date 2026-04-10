import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";

describe("TabBar", () => {
  it("renders three tabs and highlights the active one", () => {
    render(<TabBar activeTab="scan" onTabChange={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Scan" })).toHaveClass("active");
    expect(screen.getByRole("tab", { name: "Scan" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Activity" })).not.toHaveClass("active");
    expect(screen.getByRole("tab", { name: "Admin" })).not.toHaveClass("active");
  });

  it("calls onTabChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<TabBar activeTab="scan" onTabChange={handler} />);
    await user.click(screen.getByRole("tab", { name: "Admin" }));
    expect(handler).toHaveBeenCalledWith("admin");
  });
});
