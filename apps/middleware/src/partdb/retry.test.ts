import { describe, expect, it, vi } from "vitest";
import { withRetry, retryInternals, type RetryOptions } from "./retry";

const fastRetry: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1,
  maxDelayMs: 4,
};

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const operation = vi.fn(async () => "ok");

    const result = await withRetry(operation, fastRetry);

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures and succeeds on a later attempt", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce("recovered");

    const result = await withRetry(operation, fastRetry);

    expect(result).toBe("recovered");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-transient errors without retrying", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("validation failed"));

    await expect(withRetry(operation, fastRetry)).rejects.toThrowError("validation failed");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all attempts on persistent transient failures", async () => {
    const operation = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(withRetry(operation, fastRetry)).rejects.toThrowError("fetch failed");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws when maxAttempts is zero", async () => {
    const operation = vi.fn(async () => "ok");

    await expect(
      withRetry(operation, { maxAttempts: 0, baseDelayMs: 1, maxDelayMs: 1 }),
    ).rejects.toThrowError("maxAttempts must be >= 1");
    expect(operation).not.toHaveBeenCalled();
  });

  it("respects maxDelayMs to cap exponential backoff", async () => {
    const sleepSpy = vi.spyOn(retryInternals, "sleep");
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce("ok");

    await withRetry(operation, { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 150 });

    expect(sleepSpy).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 100);
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 150);
  });
});

describe("isTransient", () => {
  const { isTransient } = retryInternals;

  it("treats TypeError with fetch-related messages as transient", () => {
    expect(isTransient(new TypeError("fetch failed"))).toBe(true);
    expect(isTransient(new TypeError("network error"))).toBe(true);
    expect(isTransient(new TypeError("abort"))).toBe(true);
  });

  it("treats connection errors as transient", () => {
    expect(isTransient(new Error("ECONNREFUSED"))).toBe(true);
    expect(isTransient(new Error("ECONNRESET"))).toBe(true);
    expect(isTransient(new Error("ETIMEDOUT"))).toBe(true);
    expect(isTransient(new Error("EAI_AGAIN"))).toBe(true);
  });

  it("treats non-network errors as non-transient", () => {
    expect(isTransient(new Error("validation failed"))).toBe(false);
    expect(isTransient(new TypeError("Cannot read property"))).toBe(false);
    expect(isTransient("string error")).toBe(false);
    expect(isTransient(null)).toBe(false);
  });
});
