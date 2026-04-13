import { describe, expect, it } from "vitest";
import { parseAssignForm } from "./assign";

describe("parseAssignForm", () => {
  it("parses an existing instance assignment into a valid request", () => {
    const result = parseAssignForm({
      qrCode: " QR-1001 ",
      entityKind: "instance",
      location: " Shelf A ",
      notes: " ",
      partTypeMode: "existing",
      existingPartTypeId: " part-1 ",
      initialStatus: "available",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      qrCode: "QR-1001",
      entityKind: "instance",
      location: "Shelf A",
      notes: null,
      partType: {
        kind: "existing",
        existingPartTypeId: "part-1",
      },
      initialStatus: "available",
    });
  });

  it("rejects new bulk assignments when the form encodes an impossible countable state", () => {
    const result = parseAssignForm({
      qrCode: "QR-2001",
      entityKind: "bulk",
      location: "Shelf B",
      notes: "",
      partTypeMode: "new",
      canonicalName: "Copper wire",
      category: "Materials / Wire",
      countable: true,
      unitSymbol: "kg",
      initialQuantity: "12.5",
      minimumQuantity: "1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toMatchObject({
      kind: "parse",
      operation: "scan.assign",
      source: "form",
      retryability: "never",
      details: { issueCount: 1 },
    });
    expect(result.error.issues).toEqual([
      {
        path: "countable",
        message: "Bulk part types must not be countable.",
      },
    ]);
  });

  it("rejects invalid categories and missing new part details with precise issues", () => {
    const result = parseAssignForm({
      qrCode: "QR-3001",
      entityKind: "instance",
      location: "Shelf C",
      notes: null,
      partTypeMode: "new",
      category: " / ",
      countable: false,
      unitSymbol: "pcs",
      initialStatus: "available",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.operation).toBe("scan.assign");
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        { path: "canonicalName", message: "Name the new part type." },
        { path: "countable", message: "Discrete part types must be countable." },
      ]),
    );
  });
});
