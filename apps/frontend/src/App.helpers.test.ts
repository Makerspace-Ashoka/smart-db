import { describe, expect, it } from "vitest";
import { InvariantError } from "@smart-db/contracts";
import { ApiClientError } from "./api";
import {
  buildAssignRequest,
  buildEventRequest,
  errorMessage,
  getAssignFormIssues,
  hasAssignFormIssues,
  narrowBulkEvent,
  narrowInstanceEvent,
  normalizeNullable,
} from "./SmartApp.helpers";

describe("App helpers", () => {
  it("builds instance and bulk assignment commands from local form state", () => {
    expect(
      buildAssignRequest({
        qrCode: "QR-1001",
        entityKind: "instance",
        location: "Shelf A",
        notes: "",
        partTypeMode: "existing",
        existingPartTypeId: "part-1",
        canonicalName: "",
        category: "",
        countable: true,
        initialStatus: "available",
        initialLevel: "good",
      }),
    ).toEqual({
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

    expect(
      buildAssignRequest({
        qrCode: "QR-1003",
        entityKind: "instance",
        location: "Shelf B",
        notes: "new board",
        partTypeMode: "new",
        existingPartTypeId: "",
        canonicalName: "STM32 Nucleo",
        category: "Microcontrollers",
        countable: true,
        initialStatus: "available",
        initialLevel: "good",
      }),
    ).toEqual({
      qrCode: "QR-1003",
      entityKind: "instance",
      location: "Shelf B",
      notes: "new board",
      partType: {
        kind: "new",
        canonicalName: "STM32 Nucleo",
        category: "Microcontrollers",
        aliases: [],
        notes: null,
        imageUrl: null,
        countable: true,
      },
      initialStatus: "available",
    });

    expect(
      buildAssignRequest({
        qrCode: "QR-1002",
        entityKind: "bulk",
        location: "Bin 7",
        notes: "screws",
        partTypeMode: "new",
        existingPartTypeId: "",
        canonicalName: "M3 Screw",
        category: "Fasteners",
        countable: false,
        initialStatus: "available",
        initialLevel: "good",
      }),
    ).toEqual({
      qrCode: "QR-1002",
      entityKind: "bulk",
      location: "Bin 7",
      notes: "screws",
      partType: {
        kind: "new",
        canonicalName: "M3 Screw",
        category: "Fasteners",
        aliases: [],
        notes: null,
        imageUrl: null,
        countable: false,
        },
        initialLevel: "good",
      });

    expect(
      buildAssignRequest({
        qrCode: "QR-1004",
        entityKind: "bulk",
        location: "Bin 8",
        notes: "",
        partTypeMode: "existing",
        existingPartTypeId: "part-2",
        canonicalName: "",
        category: "",
        countable: false,
        initialStatus: "available",
        initialLevel: "low",
      }),
    ).toEqual({
      qrCode: "QR-1004",
      entityKind: "bulk",
      location: "Bin 8",
      notes: null,
      partType: {
        kind: "existing",
        existingPartTypeId: "part-2",
      },
      initialLevel: "low",
    });
  });

  it("builds lifecycle commands and normalizes empty strings", () => {
    expect(normalizeNullable("  ")).toBeNull();
    expect(
      buildEventRequest({
        targetType: "instance",
        targetId: "instance-1",
        event: "checked_out",
        location: "Workbench",
        nextLevel: "good",
        assignee: "Ayesha",
        notes: "",
      }),
    ).toEqual({
      targetType: "instance",
      targetId: "instance-1",
      event: "checked_out",
      location: "Workbench",
      notes: null,
      assignee: "Ayesha",
    });

    expect(
      buildEventRequest({
        targetType: "bulk",
        targetId: "bulk-1",
        event: "level_changed",
        location: "Wall",
        nextLevel: "low",
        assignee: "",
        notes: "running low",
      }),
    ).toEqual({
      targetType: "bulk",
      targetId: "bulk-1",
      event: "level_changed",
      location: "Wall",
      notes: "running low",
      nextLevel: "low",
    });

    expect(
      buildEventRequest({
        targetType: "bulk",
        targetId: "bulk-1",
        event: "moved",
        location: "Shelf B",
        nextLevel: "good",
        assignee: "",
        notes: "",
      }),
    ).toEqual({
      targetType: "bulk",
      targetId: "bulk-1",
      event: "moved",
      location: "Shelf B",
      notes: null,
    });
  });

  it("guards impossible event combinations", () => {
    expect(narrowInstanceEvent("checked_out")).toBe("checked_out");
    expect(narrowBulkEvent("level_changed")).toBe("level_changed");
    expect(() => narrowInstanceEvent("level_changed")).toThrowError(InvariantError);
    expect(() => narrowBulkEvent("lost")).toThrowError(InvariantError);
    expect(() =>
      buildAssignRequest({
        qrCode: "QR-1005",
        entityKind: "instance",
        location: "Shelf C",
        notes: "",
        partTypeMode: "existing",
        existingPartTypeId: "   ",
        canonicalName: "",
        category: "",
        countable: true,
        initialStatus: "available",
        initialLevel: "good",
      }),
    ).toThrowError("Choose an existing part type or switch to creating a new one.");
    expect(
      getAssignFormIssues({
        qrCode: "QR-1006",
        entityKind: "instance",
        location: " ",
        notes: "",
        partTypeMode: "new",
        existingPartTypeId: "",
        canonicalName: "",
        category: "",
        countable: true,
        initialStatus: "available",
        initialLevel: "good",
      }),
    ).toEqual({
      location: "Location is required.",
      canonicalName: "Name the new part type.",
      category: "Category is required for a new part type.",
    });
    expect(
      hasAssignFormIssues(
        getAssignFormIssues({
          qrCode: "QR-1007",
          entityKind: "instance",
          location: "Shelf A",
          notes: "",
          partTypeMode: "existing",
          existingPartTypeId: "",
          canonicalName: "",
          category: "",
          countable: true,
          initialStatus: "available",
          initialLevel: "good",
        }),
      ),
    ).toBe(true);
    expect(() =>
      buildEventRequest({
        targetType: "instance",
        targetId: "instance-1",
        event: "moved",
        location: "   ",
        nextLevel: "good",
        assignee: "",
        notes: "",
      }),
    ).toThrowError("Moved event requires a destination location.");
    expect(() =>
      buildEventRequest({
        targetType: "bulk",
        targetId: "bulk-1",
        event: "moved",
        location: "",
        nextLevel: "good",
        assignee: "",
        notes: "",
      }),
    ).toThrowError("Moved event requires a destination location.");
  });

  it("humanizes structured API failures", () => {
    expect(
      errorMessage(
        new ApiClientError("parse_input", "Could not parse assignment form.", {
          issues: [{ path: "location", message: "Location is required." }],
        }),
      ),
    ).toBe("Location is required.");
    expect(
      errorMessage(
        new ApiClientError("unauthenticated", "Authentication is required."),
      ),
    ).toBe("Your session has expired. Sign in again.");
    expect(
      errorMessage(
        new ApiClientError("conflict", "in progress", { idempotencyKey: "abc" }),
      ),
    ).toBe("That action is already being processed.");
    expect(
      errorMessage(
        new ApiClientError("integration", "Part-DB integration failed: timeout", {
          integration: "Part-DB",
        }),
      ),
    ).toBe("Part-DB is unavailable right now.");
  });
});
