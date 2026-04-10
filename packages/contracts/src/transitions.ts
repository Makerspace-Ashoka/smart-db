import type {
  BulkActionKind,
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

export function getAvailableInstanceActions(status: InstanceStatus): InstanceActionKind[] {
  return Object.keys(INSTANCE_TRANSITIONS[status]) as InstanceActionKind[];
}

export function getAvailableBulkActions(quantity: number): BulkActionKind[] {
  return quantity > 0
    ? ["moved", "restocked", "consumed", "stocktaken", "adjusted"]
    : ["moved", "restocked", "stocktaken", "adjusted"];
}

export function getNextInstanceStatus(
  current: InstanceStatus,
  event: string,
): InstanceStatus | null {
  const transitions = INSTANCE_TRANSITIONS[current];
  const next = transitions[event as InstanceActionKind];
  return next ?? null;
}

export function getNextBulkQuantity(
  current: number,
  event: string,
  input: {
    quantityDelta?: number;
    quantity?: number;
  } = {},
): number | null {
  switch (event) {
    case "moved":
      return current;
    case "restocked":
      return typeof input.quantityDelta === "number" ? current + input.quantityDelta : null;
    case "consumed":
      if (typeof input.quantityDelta !== "number" || input.quantityDelta > current) {
        return null;
      }
      return current - input.quantityDelta;
    case "stocktaken":
      return typeof input.quantity === "number" ? input.quantity : null;
    case "adjusted": {
      if (typeof input.quantityDelta !== "number") {
        return null;
      }
      const next = current + input.quantityDelta;
      return next >= 0 ? next : null;
    }
    default:
      return null;
  }
}
