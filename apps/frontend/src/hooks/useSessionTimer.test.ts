import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionTimer } from "./useSessionTimer";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSessionTimer", () => {
  it("returns null when no expiry is set", () => {
    const { result } = renderHook(() => useSessionTimer(null));
    expect(result.current.minutesRemaining).toBeNull();
    expect(result.current.isExpiringSoon).toBe(false);
  });

  it("returns minutes remaining and flags expiring soon", () => {
    const threeMinutesFromNow = new Date(Date.now() + 3 * 60_000).toISOString();
    const { result } = renderHook(() => useSessionTimer(threeMinutesFromNow));
    expect(result.current.minutesRemaining).toBeLessThanOrEqual(3);
    expect(result.current.isExpiringSoon).toBe(true);
  });

  it("does not flag as expiring when far in the future", () => {
    const oneHourFromNow = new Date(Date.now() + 60 * 60_000).toISOString();
    const { result } = renderHook(() => useSessionTimer(oneHourFromNow));
    expect(result.current.minutesRemaining).toBeGreaterThan(5);
    expect(result.current.isExpiringSoon).toBe(false);
  });
});
