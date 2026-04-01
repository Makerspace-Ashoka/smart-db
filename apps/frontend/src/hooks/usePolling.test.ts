import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "./usePolling";

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePolling", () => {
  it("calls the callback at the configured interval", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 5000, true));

    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("does not call when disabled", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 5000, false));

    vi.advanceTimersByTime(15000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("skips when tab is hidden", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 5000, true));

    Object.defineProperty(document, "visibilityState", { value: "hidden" });
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});
