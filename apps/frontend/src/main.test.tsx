import { beforeEach, describe, expect, it, vi } from "vitest";

const startRewriteApp = vi.fn();

vi.mock("./rewrite/app-controller", () => ({
  startRewriteApp,
}));

describe("main", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.clearAllMocks();
  });

  it("mounts the rewrite app into the root element", async () => {
    await import("./main");

    expect(startRewriteApp).toHaveBeenCalledWith(document.getElementById("root"));
  });
});
