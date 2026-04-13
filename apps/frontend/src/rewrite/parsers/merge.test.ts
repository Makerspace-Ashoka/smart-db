import { describe, expect, it } from "vitest";
import { parseMergeForm } from "./merge";

describe("parseMergeForm", () => {
  it("parses a merge request and normalizes the alias label", () => {
    const result = parseMergeForm({
      sourcePartTypeId: "source-1",
      destinationPartTypeId: "destination-1",
      aliasLabel: "  Router  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      sourcePartTypeId: "source-1",
      destinationPartTypeId: "destination-1",
      aliasLabel: "Router",
    });
  });

  it("rejects self-merges with a destination field issue", () => {
    const result = parseMergeForm({
      sourcePartTypeId: "part-2",
      destinationPartTypeId: "part-2",
      aliasLabel: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toMatchObject({
      kind: "parse",
      operation: "admin.mergePartType",
      source: "form",
      details: { issueCount: 1 },
    });
    expect(result.error.message).toBe(
      "Could not parse merge form: Choose two different part types; a part type cannot be merged into itself.",
    );
    expect(result.error.issues).toEqual([
      {
        path: "destinationPartTypeId",
        message: "Choose two different part types; a part type cannot be merged into itself.",
      },
    ]);
  });
});
