import { describe, expect, it } from "vitest";
import { createParseFailure, failureSummary, isRetryableFailure } from "./errors";

describe("rewrite failure helpers", () => {
  it("builds parse failures with structured recovery metadata and a precise headline", () => {
    const failure = createParseFailure("scan.assign", "form", [
      {
        path: "qrCode",
        message: "QR code is required.",
      },
      {
        path: "location",
        message: "Choose the location where this item will live.",
      },
    ]);

    expect(failure).toMatchObject({
      kind: "parse",
      operation: "scan.assign",
      source: "form",
      message: "Could not parse assignment form: QR code is required.",
      retryability: "never",
      details: {
        source: "form",
        context: "assignment form",
        issueCount: 2,
        primaryPath: "qrCode",
        primaryMessage: "QR code is required.",
      },
    });
    expect(failureSummary(failure)).toBe(failure.message);
    expect(isRetryableFailure(failure)).toBe(false);
  });
});
