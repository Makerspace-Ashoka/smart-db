import { describe, expect, it } from "vitest";
import type { BulkLevel, InstanceStatus } from "./schemas";
import {
  getAvailableBulkActions,
  getAvailableInstanceActions,
  getNextBulkLevel,
  getNextInstanceStatus,
} from "./transitions";

describe("transitions", () => {
  it("maps each instance status to the correct available actions", () => {
    expect(getAvailableInstanceActions("available")).toEqual(
      expect.arrayContaining(["moved", "checked_out", "consumed", "damaged", "lost", "disposed"]),
    );
    expect(getAvailableInstanceActions("checked_out")).toEqual(
      expect.arrayContaining(["moved", "returned", "consumed", "damaged", "lost", "disposed"]),
    );
    expect(getAvailableInstanceActions("damaged")).toEqual(
      expect.arrayContaining(["moved", "disposed", "returned", "lost"]),
    );
    expect(getAvailableInstanceActions("lost")).toEqual(
      expect.arrayContaining(["returned", "disposed"]),
    );
    expect(getAvailableInstanceActions("consumed")).toEqual([]);
  });

  it("maps each bulk level to the correct available actions", () => {
    for (const level of ["full", "good", "low"] as BulkLevel[]) {
      expect(getAvailableBulkActions(level)).toEqual(
        expect.arrayContaining(["moved", "level_changed", "consumed"]),
      );
    }
    expect(getAvailableBulkActions("empty")).toEqual(
      expect.arrayContaining(["moved", "level_changed"]),
    );
    expect(getAvailableBulkActions("empty")).not.toContain("consumed");
  });

  it("returns the correct next instance status for legal transitions", () => {
    expect(getNextInstanceStatus("available", "checked_out")).toBe("checked_out");
    expect(getNextInstanceStatus("available", "moved")).toBe("available");
    expect(getNextInstanceStatus("available", "consumed")).toBe("consumed");
    expect(getNextInstanceStatus("available", "damaged")).toBe("damaged");
    expect(getNextInstanceStatus("available", "lost")).toBe("lost");
    expect(getNextInstanceStatus("available", "disposed")).toBe("consumed");
    expect(getNextInstanceStatus("checked_out", "returned")).toBe("available");
    expect(getNextInstanceStatus("checked_out", "consumed")).toBe("consumed");
    expect(getNextInstanceStatus("damaged", "returned")).toBe("available");
    expect(getNextInstanceStatus("damaged", "disposed")).toBe("consumed");
    expect(getNextInstanceStatus("lost", "returned")).toBe("available");
  });

  it("returns null for illegal instance transitions", () => {
    expect(getNextInstanceStatus("consumed", "moved")).toBeNull();
    expect(getNextInstanceStatus("consumed", "returned")).toBeNull();
    expect(getNextInstanceStatus("available", "returned")).toBeNull();
    expect(getNextInstanceStatus("lost", "moved")).toBeNull();
    expect(getNextInstanceStatus("lost", "consumed")).toBeNull();
    expect(getNextInstanceStatus("damaged", "checked_out")).toBeNull();
  });

  it("returns the correct next bulk level for legal transitions", () => {
    expect(getNextBulkLevel("good", "moved")).toBe("good");
    expect(getNextBulkLevel("good", "level_changed", "low")).toBe("low");
    expect(getNextBulkLevel("good", "level_changed")).toBe("good");
    expect(getNextBulkLevel("good", "consumed", "empty")).toBe("empty");
    expect(getNextBulkLevel("good", "consumed")).toBe("low");
    expect(getNextBulkLevel("empty", "moved")).toBe("empty");
    expect(getNextBulkLevel("empty", "level_changed", "full")).toBe("full");
  });

  it("returns null for illegal bulk transitions", () => {
    expect(getNextBulkLevel("empty", "consumed")).toBeNull();
  });
});
