import type { BulkLevel, InstanceStatus, StockEventKind } from "./schemas.js";

type InstanceEventKind = Extract<
  StockEventKind,
  "moved" | "checked_out" | "returned" | "consumed" | "damaged" | "lost" | "disposed"
>;

type BulkEventKind = Extract<StockEventKind, "moved" | "level_changed" | "consumed">;

export const INSTANCE_TRANSITIONS: Record<
  InstanceStatus,
  Partial<Record<InstanceEventKind, InstanceStatus>>
> = {
  available: {
    moved: "available",
    checked_out: "checked_out",
    consumed: "consumed",
    damaged: "damaged",
    lost: "lost",
    disposed: "consumed",
  },
  checked_out: {
    moved: "checked_out",
    checked_out: "checked_out",
    returned: "available",
    consumed: "consumed",
    damaged: "damaged",
    lost: "lost",
    disposed: "consumed",
  },
  damaged: {
    moved: "damaged",
    disposed: "consumed",
    returned: "available",
    lost: "lost",
  },
  lost: {
    returned: "available",
    disposed: "consumed",
  },
  consumed: {},
};

export const BULK_TRANSITIONS: Record<
  BulkLevel,
  Partial<Record<BulkEventKind, "keep">>
> = {
  full: { moved: "keep", level_changed: "keep", consumed: "keep" },
  good: { moved: "keep", level_changed: "keep", consumed: "keep" },
  low: { moved: "keep", level_changed: "keep", consumed: "keep" },
  empty: { moved: "keep", level_changed: "keep" },
};

export function getAvailableInstanceActions(status: InstanceStatus): InstanceEventKind[] {
  return Object.keys(INSTANCE_TRANSITIONS[status]) as InstanceEventKind[];
}

export function getAvailableBulkActions(level: BulkLevel): BulkEventKind[] {
  return Object.keys(BULK_TRANSITIONS[level]) as BulkEventKind[];
}

export function getNextInstanceStatus(
  current: InstanceStatus,
  event: string,
): InstanceStatus | null {
  const transitions = INSTANCE_TRANSITIONS[current];
  const next = transitions[event as InstanceEventKind];
  return next ?? null;
}

export function getNextBulkLevel(
  current: BulkLevel,
  event: string,
  requestedLevel?: BulkLevel,
): BulkLevel | null {
  const transitions = BULK_TRANSITIONS[current];
  if (!(event in transitions)) {
    return null;
  }

  if (event === "level_changed") {
    return requestedLevel ?? current;
  }

  if (event === "consumed") {
    return requestedLevel ?? "low";
  }

  return current;
}
