import { describe, expect, it } from "vitest";
import { parseEventForm } from "./event";

describe("parseEventForm", () => {
  it("parses a bulk split as a dedicated split command", () => {
    const result = parseEventForm({
      targetType: "bulk",
      targetId: "bulk-1",
      event: "moved",
      location: "Shelf D",
      splitQuantity: "2.5",
      quantityIsInteger: false,
      notes: "Split off a sample",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      kind: "split",
      targetId: "bulk-1",
      request: {
        quantity: 2.5,
        destinationLocation: "Shelf D",
        notes: "Split off a sample",
      },
    });
  });

  it("parses a bulk adjustment as a record command and normalizes hidden fields away", () => {
    const result = parseEventForm({
      targetType: "bulk",
      targetId: "bulk-2",
      event: "adjusted",
      quantityDelta: "-1.5",
      quantityIsInteger: false,
      notes: "Correcting a weighing error",
      location: "should not matter",
      splitQuantity: "3",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      kind: "record",
      request: {
        targetType: "bulk",
        targetId: "bulk-2",
        event: "adjusted",
        location: null,
        notes: "Correcting a weighing error",
        quantityDelta: -1.5,
      },
    });
  });

  it("rejects unsupported event/target combinations before they reach the API layer", () => {
    const result = parseEventForm({
      targetType: "instance",
      targetId: "instance-9",
      event: "restocked",
      notes: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toMatchObject({
      kind: "parse",
      operation: "scan.recordEvent",
      source: "form",
      retryability: "never",
      details: { issueCount: 1 },
    });
    expect(result.error.issues).toEqual([
      {
        path: "event",
        message: "Instance events do not support 'restocked'.",
      },
    ]);
  });
});
