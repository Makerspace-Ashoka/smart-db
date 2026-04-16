import { describe, expect, it } from "vitest";
import { parseReverseIngestForm } from "./reverse-ingest";

describe("parseReverseIngestForm", () => {
  it("parses a valid ingest reversal command", () => {
    const result = parseReverseIngestForm({
      qrCode: "DM-0001",
      assignedKind: "instance",
      assignedId: "instance-1",
      reason: "Wrong item labeled",
    });

    expect(result.ok).toBe(true);
  });

  it("requires a reason", () => {
    const result = parseReverseIngestForm({
      qrCode: "DM-0001",
      assignedKind: "instance",
      assignedId: "instance-1",
      reason: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues[0]?.path).toBe("reason");
  });
});
