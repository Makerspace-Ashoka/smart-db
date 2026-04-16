import { describe, expect, it } from "vitest";
import { parseEditPartTypeDefinitionForm } from "./edit-part-type-definition";

describe("parseEditPartTypeDefinitionForm", () => {
  it("parses a valid shared part type edit", () => {
    const result = parseEditPartTypeDefinitionForm({
      partTypeId: "part-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      canonicalName: "Black PLA+",
      category: "Materials / 3D Printing",
      reason: "Fix shared definition",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects invalid category paths", () => {
    const result = parseEditPartTypeDefinitionForm({
      partTypeId: "part-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      canonicalName: "Black PLA+",
      category: "Materials / Bad|Segment",
      reason: "Fix shared definition",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues[0]?.path).toBe("category");
  });
});
