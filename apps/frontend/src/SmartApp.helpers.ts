import type {
  AssignQrRequest,
  BulkLevel,
  InstanceStatus,
  InventoryTargetKind,
  RecordEventRequest,
  StockEventKind,
} from "@smart-db/contracts";
import { InvariantError } from "@smart-db/contracts";
import { ApiClientError } from "./api";

export type AssignFormState = {
  qrCode: string;
  entityKind: InventoryTargetKind;
  location: string;
  notes: string;
  partTypeMode: "existing" | "new";
  existingPartTypeId: string;
  canonicalName: string;
  category: string;
  countable: boolean;
  initialStatus: InstanceStatus;
  initialLevel: BulkLevel;
};

export type AssignFormIssues = Partial<
  Record<"location" | "existingPartTypeId" | "canonicalName" | "category", string>
>;

export type EventFormState = {
  targetType: InventoryTargetKind;
  targetId: string;
  event: StockEventKind;
  location: string;
  nextLevel: BulkLevel;
  assignee: string;
  notes: string;
};

export function getAssignFormIssues(form: AssignFormState): AssignFormIssues {
  const issues: AssignFormIssues = {};

  if (!form.location.trim()) {
    issues.location = "Location is required.";
  }

  if (form.partTypeMode === "existing") {
    if (!form.existingPartTypeId.trim()) {
      issues.existingPartTypeId = "Choose an existing part type or switch to creating a new one.";
    }

    return issues;
  }

  if (!form.canonicalName.trim()) {
    issues.canonicalName = "Name the new part type.";
  }

  if (!form.category.trim()) {
    issues.category = "Category is required for a new part type.";
  }

  return issues;
}

export function hasAssignFormIssues(issues: AssignFormIssues): boolean {
  return Object.keys(issues).length > 0;
}

export function buildAssignRequest(form: AssignFormState): AssignQrRequest {
  const issues = getAssignFormIssues(form);
  const firstIssue = Object.values(issues)[0];
  if (firstIssue) {
    throw new InvariantError(firstIssue);
  }

  const notes = normalizeNullable(form.notes);
  const location = form.location.trim();

  if (form.partTypeMode === "existing") {
    const existingPartTypeId = form.existingPartTypeId.trim();

    return form.entityKind === "instance"
      ? {
          qrCode: form.qrCode,
          entityKind: "instance",
          location,
          notes,
          partType: {
            kind: "existing",
            existingPartTypeId,
          },
          initialStatus: form.initialStatus,
        }
      : {
          qrCode: form.qrCode,
          entityKind: "bulk",
          location,
          notes,
          partType: {
            kind: "existing",
            existingPartTypeId,
          },
          initialLevel: form.initialLevel,
        };
  }

  return form.entityKind === "instance"
    ? {
        qrCode: form.qrCode,
        entityKind: "instance",
        location,
        notes,
        partType: {
          kind: "new",
          canonicalName: form.canonicalName.trim(),
          category: form.category.trim(),
          aliases: [],
          notes: null,
          imageUrl: null,
          countable: form.countable,
        },
        initialStatus: form.initialStatus,
      }
    : {
        qrCode: form.qrCode,
        entityKind: "bulk",
        location,
        notes,
        partType: {
          kind: "new",
          canonicalName: form.canonicalName.trim(),
          category: form.category.trim(),
          aliases: [],
          notes: null,
          imageUrl: null,
          countable: form.countable,
        },
        initialLevel: form.initialLevel,
      };
}

export function buildEventRequest(form: EventFormState): RecordEventRequest {
  if (form.targetType === "instance") {
    const event = narrowInstanceEvent(form.event);
    const location = normalizeNullable(form.location);
    const notes = normalizeNullable(form.notes);
    if (event === "checked_out") {
      return {
        targetType: "instance",
        targetId: form.targetId,
        event,
        location,
        notes,
        assignee: normalizeNullable(form.assignee),
      };
    }

    if (event === "moved") {
      if (!location) {
        throw new InvariantError("Moved event requires a destination location.");
      }

      return {
        targetType: "instance",
        targetId: form.targetId,
        event,
        location,
        notes,
      };
    }

    return {
      targetType: "instance",
      targetId: form.targetId,
      event,
      location,
      notes,
    };
  }

  const event = narrowBulkEvent(form.event);
  const location = normalizeNullable(form.location);
  const notes = normalizeNullable(form.notes);
  if (event === "level_changed" || event === "consumed") {
    return {
      targetType: "bulk",
      targetId: form.targetId,
      event,
      location,
      notes,
      nextLevel: form.nextLevel,
    };
  }

  if (!location) {
    throw new InvariantError("Moved event requires a destination location.");
  }

  return {
    targetType: "bulk",
    targetId: form.targetId,
    event,
    location,
    notes,
  };
}

export function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function narrowInstanceEvent(
  event: StockEventKind,
): Extract<
  StockEventKind,
  "moved" | "checked_out" | "returned" | "consumed" | "damaged" | "lost" | "disposed"
> {
  if (event === "level_changed" || event === "labeled") {
    throw new InvariantError(`Invalid instance event: ${event}`);
  }

  return event;
}

export function narrowBulkEvent(
  event: StockEventKind,
): Extract<StockEventKind, "moved" | "level_changed" | "consumed"> {
  if (event !== "moved" && event !== "level_changed" && event !== "consumed") {
    throw new InvariantError(`Invalid bulk event: ${event}`);
  }

  return event;
}

export function errorMessage(value: unknown): string {
  if (value instanceof ApiClientError) {
    return humanizeApiError(value);
  }

  if (value instanceof Error) {
    return value.message;
  }

  return "Something went wrong.";
}

export function actionLabel(event: StockEventKind): string {
  switch (event) {
    case "checked_out":
      return "Check out";
    case "level_changed":
      return "Update level";
    case "disposed":
      return "Dispose";
    case "returned":
      return "Return";
    case "consumed":
      return "Mark consumed";
    case "damaged":
      return "Mark damaged";
    case "lost":
      return "Mark lost";
    case "moved":
      return "Move";
    case "labeled":
      return "Labeled";
    default:
      return event;
  }
}

export function formatTimestamp(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function humanizeApiError(error: ApiClientError): string {
  switch (error.code) {
    case "parse_input":
      return parseInputMessage(error);
    case "unauthenticated":
      return "Your session has expired. Sign in again.";
    case "forbidden":
      return "You do not have permission to do that.";
    case "not_found":
      return notFoundMessage(error.details);
    case "conflict":
      return conflictMessage(error.message, error.details);
    case "integration":
      return integrationMessage(error.details, error.message);
    case "transport":
      return "The request could not be completed. Check your connection and try again.";
    default:
      return error.message;
  }
}

function parseInputMessage(error: ApiClientError): string {
  const issues = Array.isArray(error.details.issues)
    ? error.details.issues as Array<{ path?: unknown; message?: unknown }>
    : [];
  const firstIssue = issues[0];
  if (typeof firstIssue?.message === "string" && firstIssue.message) {
    return firstIssue.message;
  }

  if (typeof error.message === "string" && error.message) {
    return error.message;
  }

  return "The form is incomplete or invalid.";
}

function notFoundMessage(details: Record<string, unknown>): string {
  const entity = typeof details.entity === "string" ? details.entity : "Record";
  return `${entity} could not be found anymore.`;
}

function conflictMessage(message: string, details: Record<string, unknown>): string {
  if (typeof details.idempotencyKey === "string") {
    return "That action is already being processed.";
  }

  if (message.includes("already")) {
    return message;
  }

  return "That change conflicts with the current data. Refresh and try again.";
}

function integrationMessage(details: Record<string, unknown>, fallback: string): string {
  if (details.integration === "Part-DB") {
    return "Part-DB is unavailable right now.";
  }

  if (details.integration === "Zitadel") {
    return "Sign-in is temporarily unavailable.";
  }

  return fallback;
}
