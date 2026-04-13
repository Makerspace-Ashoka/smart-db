import {
  type BulkSplitRequest,
  type RecordEventRequest,
  type StockEventKind,
  bulkActionKinds,
  instanceActionKinds,
} from "@smart-db/contracts";
import type { ParseIssue } from "@smart-db/contracts";
import { Ok } from "@smart-db/contracts";
import {
  failParse,
  isRecord,
  readBoolean,
  readLiteral,
  readOptionalNumber,
  readOptionalString,
  readRequiredNumber,
  readRequiredString,
  type ParseResult,
} from "./shared";

type InstanceEventKind = Extract<StockEventKind, (typeof instanceActionKinds)[number]>;
type BulkEventKind = Extract<StockEventKind, (typeof bulkActionKinds)[number]>;

export type EventCommand =
  | {
      readonly kind: "record";
      readonly request: RecordEventRequest;
    }
  | {
      readonly kind: "split";
      readonly targetId: string;
      readonly request: BulkSplitRequest;
    };

export function parseEventForm(input: unknown): ParseResult<EventCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const targetType = readLiteral(
    record,
    "targetType",
    ["instance", "bulk"] as const,
    issues,
    "Choose whether the event applies to an instance or bulk stock.",
  );
  const targetId = readRequiredString(
    record,
    "targetId",
    issues,
    "Choose the item this event should update.",
  );
  const event = readLiteral(
    record,
    "event",
    [...instanceActionKinds, ...bulkActionKinds] as const,
    issues,
    "Choose a supported event for this item.",
  );
  const notes = readOptionalString(record, "notes", issues);

  if (!targetType || !targetId || !event) {
    return failParse("scan.recordEvent", issues);
  }

  if (targetType === "instance") {
    return parseInstanceEvent(record, targetId, event as InstanceEventKind, notes, issues);
  }

  return parseBulkEvent(record, targetId, event as BulkEventKind, notes, issues);
}

function parseInstanceEvent(
  record: Record<string, unknown>,
  targetId: string,
  event: InstanceEventKind,
  notes: string | null,
  issues: ParseIssue[],
): ParseResult<EventCommand> {
  if (!instanceActionKinds.includes(event)) {
    issues.push({
      path: "event",
      message: `Instance items do not support '${event}'. Choose ${formatChoices(instanceActionKinds)}.`,
    });
    return failParse("scan.recordEvent", issues);
  }

  if (event === "moved") {
    const location = readRequiredString(
      record,
      "location",
      issues,
      "Choose the destination location.",
    );

    if (issues.length > 0 || !location) {
      return failParse("scan.recordEvent", issues);
    }

    return Ok({
      kind: "record",
      request: {
        targetType: "instance",
        targetId,
        event: "moved",
        location,
        notes,
      },
    });
  }

  if (event === "checked_out") {
    const location = readOptionalString(record, "location", issues);
    const assignee = readOptionalString(record, "assignee", issues);

    if (issues.length > 0) {
      return failParse("scan.recordEvent", issues);
    }

    return Ok({
      kind: "record",
      request: {
        targetType: "instance",
        targetId,
        event: "checked_out",
        location: location ?? null,
        notes,
        assignee: assignee ?? null,
      },
    });
  }

  const location = readOptionalString(record, "location", issues);

  if (issues.length > 0) {
    return failParse("scan.recordEvent", issues);
  }

  return Ok({
    kind: "record",
    request: {
      targetType: "instance",
      targetId,
      event,
      location: location ?? null,
      notes,
    },
  });
}

function parseBulkEvent(
  record: Record<string, unknown>,
  targetId: string,
  event: BulkEventKind,
  notes: string | null,
  issues: ParseIssue[],
): ParseResult<EventCommand> {
  if (!bulkActionKinds.includes(event)) {
    issues.push({
      path: "event",
      message: `Bulk stock does not support '${event}'. Choose ${formatChoices(bulkActionKinds)}.`,
    });
    return failParse("scan.recordEvent", issues);
  }

  if (event === "moved") {
    const location = readRequiredString(
      record,
      "location",
      issues,
      "Choose the destination location.",
    );
    const splitQuantity = readOptionalNumber(
      record,
      "splitQuantity",
      issues,
      "Enter a positive quantity to split off.",
      { positive: true },
    );
    const quantityIsInteger = readBoolean(
      record,
      "quantityIsInteger",
      issues,
      "Specify whether this stock only allows whole-number quantities.",
    );

    if (splitQuantity !== null && quantityIsInteger && !Number.isInteger(splitQuantity)) {
      issues.push({
        path: "splitQuantity",
        message: "Enter a whole-number split quantity for integer-only stock.",
      });
    }

    if (issues.length > 0 || !location) {
      return failParse("scan.recordEvent", issues);
    }

    if (splitQuantity !== null) {
      return Ok({
        kind: "split",
        targetId,
        request: {
          quantity: splitQuantity,
          destinationLocation: location,
          notes,
        },
      });
    }

    return Ok({
      kind: "record",
      request: {
        targetType: "bulk",
        targetId,
        event: "moved",
        location,
        notes,
      },
    });
  }

  if (event === "restocked" || event === "consumed") {
    const quantityDelta = readRequiredNumber(
      record,
      "quantityDelta",
      issues,
      "Enter a quantity greater than zero.",
      { positive: true },
    );

    if (issues.length > 0) {
      return failParse("scan.recordEvent", issues);
    }

    return Ok({
      kind: "record",
      request: {
        targetType: "bulk",
        targetId,
        event,
        location: null,
        notes,
        quantityDelta: quantityDelta ?? 0,
      },
    });
  }

  if (event === "stocktaken") {
    const quantity = readRequiredNumber(
      record,
      "quantity",
      issues,
      "Enter the measured quantity on hand.",
      { nonnegative: true },
    );

    if (issues.length > 0) {
      return failParse("scan.recordEvent", issues);
    }

    return Ok({
      kind: "record",
      request: {
        targetType: "bulk",
        targetId,
        event: "stocktaken",
        location: null,
        notes,
        quantity: quantity ?? 0,
      },
    });
  }

  const quantityDelta = readRequiredNumber(
    record,
    "quantityDelta",
    issues,
    "Enter a signed quantity adjustment.",
  );
  const quantityIsInteger = readBoolean(
    record,
    "quantityIsInteger",
    issues,
    "Choose whether this stock only allows whole-number quantities.",
  );

  if (quantityDelta !== null && quantityIsInteger && !Number.isInteger(quantityDelta)) {
    issues.push({
      path: "quantityDelta",
      message: "Enter a whole-number adjustment for integer-only stock.",
    });
  }

  const adjustedNotes = readRequiredString(
    record,
    "notes",
    issues,
    "Explain why this correction is needed.",
  );

  if (issues.length > 0 || !adjustedNotes) {
    return failParse("scan.recordEvent", issues);
  }

  return Ok({
    kind: "record",
    request: {
      targetType: "bulk",
      targetId,
      event: "adjusted",
      location: null,
      notes: adjustedNotes,
      quantityDelta: quantityDelta ?? 0,
    },
  });
}

function formatChoices(choices: readonly string[]): string {
  if (choices.length === 0) {
    return "no actions";
  }

  if (choices.length === 1) {
    return choices[0]!;
  }

  if (choices.length === 2) {
    return `${choices[0]} or ${choices[1]}`;
  }

  return `${choices.slice(0, -1).join(", ")}, or ${choices[choices.length - 1]}`;
}
