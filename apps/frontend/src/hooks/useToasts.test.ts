import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToasts } from "./useToasts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useToasts", () => {
  it("adds and dismisses toasts", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.addToast("hello", "error");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe("hello");

    act(() => {
      result.current.dismissToast(result.current.toasts[0]!.id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("auto-dismisses success toasts after 2 seconds", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.addToast("done", "success");
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("does not auto-dismiss error toasts", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.addToast("oops", "error");
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.toasts).toHaveLength(1);
  });
});
