import { describe, expect, it } from "vitest";
import { parseReassignPartTypeForm } from "./reassign-part-type";

describe("parseReassignPartTypeForm", () => {
  it("parses a valid entity reassignment command", () => {
    const result = parseReassignPartTypeForm({
      targetType: "bulk",
      targetId: "bulk-1",
      fromPartTypeId: "part-a",
      toPartTypeId: "part-b",
      reason: "Wrong type during intake",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.toPartTypeId).toBe("part-b");
  });

  it("rejects self-reassignment", () => {
    const result = parseReassignPartTypeForm({
      targetType: "bulk",
      targetId: "bulk-1",
      fromPartTypeId: "part-a",
      toPartTypeId: "part-a",
      reason: "same",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues).toEqual([
      {
        path: "toPartTypeId",
        message: "Current and replacement part types must be different.",
      },
    ]);
  });
});
