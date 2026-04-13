import { describe, expect, it } from "vitest";
import { parseBatchForm } from "./batch";

describe("parseBatchForm", () => {
  it("parses a batch form and applies the prefix default only when needed", () => {
    const result = parseBatchForm({
      prefix: " QR_2026 ",
      startNumber: "1001",
      count: "25",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      prefix: "QR_2026",
      startNumber: 1001,
      count: 25,
    });
  });

  it("rejects invalid batch sizing with a parse failure that names the bad field", () => {
    const result = parseBatchForm({
      prefix: "QR!",
      startNumber: "-1",
      count: "501",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toMatchObject({
      kind: "parse",
      operation: "admin.registerBatch",
      source: "form",
      details: { issueCount: 3 },
    });
    expect(result.error.message).toBe(
      "Could not parse batch form: Prefix may contain only letters, numbers, hyphens, and underscores.",
    );
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        {
          path: "prefix",
          message: "Prefix may contain only letters, numbers, hyphens, and underscores.",
        },
        {
          path: "startNumber",
          message: "Start number must be zero or greater.",
        },
        {
          path: "count",
          message: "Batch size must be between 1 and 500.",
        },
      ]),
    );
  });
});
