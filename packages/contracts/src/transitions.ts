import type {
  BulkActionKind,
  BulkLevel,
  InstanceActionKind,
  InstanceStatus,
} from "./schemas.js";

export const INSTANCE_TRANSITIONS: Record<
  InstanceStatus,
  Partial<Record<InstanceActionKind, InstanceStatus>>
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
  Partial<Record<BulkActionKind, "keep">>
> = {
  full: { moved: "keep", level_changed: "keep", consumed: "keep" },
  good: { moved: "keep", level_changed: "keep", consumed: "keep" },
  low: { moved: "keep", level_changed: "keep", consumed: "keep" },
  empty: { moved: "keep", level_changed: "keep" },
};

export function getAvailableInstanceActions(status: InstanceStatus): InstanceActionKind[] {
  return Object.keys(INSTANCE_TRANSITIONS[status]) as InstanceActionKind[];
}

export function getAvailableBulkActions(level: BulkLevel): BulkActionKind[] {
  return Object.keys(BULK_TRANSITIONS[level]) as BulkActionKind[];
}

export function getNextInstanceStatus(
  current: InstanceStatus,
  event: string,
): InstanceStatus | null {
  const transitions = INSTANCE_TRANSITIONS[current];
  const next = transitions[event as InstanceActionKind];
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
