import {
  defaultMeasurementUnit,
  type AssignQrRequest,
} from "@smart-db/contracts";
import type { ParseIssue } from "@smart-db/contracts";
import { Ok } from "@smart-db/contracts";
import {
  failParse,
  isRecord,
  readBoolean,
  readCategoryPath,
  readInstanceStatus,
  readLiteral,
  readMeasurementUnit,
  readOptionalNumber,
  readOptionalString,
  readRequiredNumber,
  readRequiredString,
  type ParseResult,
} from "./shared";

export type AssignCommand = AssignQrRequest;

export function parseAssignForm(input: unknown): ParseResult<AssignCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const qrCode = readRequiredString(record, "qrCode", issues, "QR code is required.");
  const entityKind = readLiteral(
    record,
    "entityKind",
    ["instance", "bulk"] as const,
    issues,
    "Choose whether the QR tracks a discrete item or bulk stock.",
  );
  const location = readRequiredString(record, "location", issues, "Location is required.");
  const notes = readOptionalString(record, "notes", issues);
  const partTypeMode = readLiteral(
    record,
    "partTypeMode",
    ["existing", "new"] as const,
    issues,
    "Choose whether to reuse an existing part type or create a new one.",
  );

  if (!qrCode || !entityKind || !location || !partTypeMode) {
    return failParse("scan.assign", "Could not parse assignment form.", issues);
  }

  const existingPartTypeId = readOptionalString(record, "existingPartTypeId", issues);
  const canonicalName = readOptionalString(record, "canonicalName", issues);
  const category = readOptionalString(record, "category", issues);
  const initialStatus = readInstanceStatus(
    record,
    "initialStatus",
    issues,
    "Choose a valid initial instance status.",
  );

  const bulkInitialQuantity = entityKind === "bulk"
    ? readRequiredNumber(
        record,
        "initialQuantity",
        issues,
        "Starting quantity must be zero or greater.",
        { nonnegative: true },
      )
    : null;
  const bulkMinimumQuantity = entityKind === "bulk"
    ? readOptionalNumber(
        record,
        "minimumQuantity",
        issues,
        "Low-stock threshold must be zero or greater.",
        { nonnegative: true },
      )
    : null;
  const bulkUnit = entityKind === "bulk"
    ? readMeasurementUnit(
        record,
        "unitSymbol",
        issues,
        "Choose a valid unit of measure.",
      )
    : null;

  if (partTypeMode === "existing" && !existingPartTypeId) {
    issues.push({
      path: "existingPartTypeId",
      message: "Choose an existing part type.",
    });
  }

  if (partTypeMode === "new") {
    const countable = readBoolean(
      record,
      "countable",
      issues,
      "Choose whether the part type tracks discrete items or measured stock.",
    );

    if (countable !== null) {
      if (entityKind === "instance" && !countable) {
        issues.push({
          path: "countable",
          message: "Discrete part types must be countable.",
        });
      }

      if (entityKind === "bulk" && countable) {
        issues.push({
          path: "countable",
          message: "Bulk part types must not be countable.",
        });
      }
    }

    if (!canonicalName) {
      issues.push({
        path: "canonicalName",
        message: "Name the new part type.",
      });
    }

    if (!category) {
      issues.push({
        path: "category",
        message: "Category is required.",
      });
    } else {
      readCategoryPath(record, "category", issues);
    }

    if (entityKind === "bulk" && !bulkUnit) {
      issues.push({
        path: "unitSymbol",
        message: "Choose a valid unit of measure.",
      });
    }
  }

  if (entityKind === "instance" && !initialStatus) {
    issues.push({
      path: "initialStatus",
      message: "Choose a valid initial instance status.",
    });
  }

  if (issues.length > 0) {
    return failParse("scan.assign", "Could not parse assignment form.", issues);
  }

  const normalizedNotes = notes;
  const normalizedLocation = location;
  const normalizedQrCode = qrCode;

  if (partTypeMode === "existing") {
    if (entityKind === "instance") {
      return Ok({
        qrCode: normalizedQrCode,
        entityKind,
        location: normalizedLocation,
        notes: normalizedNotes,
        partType: {
          kind: "existing",
          existingPartTypeId: existingPartTypeId ?? "",
        },
        initialStatus: initialStatus ?? "available",
      });
    }

    return Ok({
      qrCode: normalizedQrCode,
      entityKind,
      location: normalizedLocation,
      notes: normalizedNotes,
      partType: {
        kind: "existing",
        existingPartTypeId: existingPartTypeId ?? "",
      },
      initialQuantity: bulkInitialQuantity ?? 0,
      minimumQuantity: bulkMinimumQuantity,
    });
  }

  if (entityKind === "instance") {
    return Ok({
      qrCode: normalizedQrCode,
      entityKind,
      location: normalizedLocation,
      notes: normalizedNotes,
      partType: {
        kind: "new",
        canonicalName: canonicalName ?? "",
        category: category ?? "",
        aliases: [],
        notes: null,
        imageUrl: null,
        countable: true,
        unit: defaultMeasurementUnit,
      },
      initialStatus: initialStatus ?? "available",
    });
  }

  return Ok({
    qrCode: normalizedQrCode,
    entityKind,
    location: normalizedLocation,
    notes: normalizedNotes,
    partType: {
      kind: "new",
      canonicalName: canonicalName ?? "",
      category: category ?? "",
      aliases: [],
      notes: null,
      imageUrl: null,
      countable: false,
      unit: bulkUnit ?? defaultMeasurementUnit,
    },
    initialQuantity: bulkInitialQuantity ?? 0,
    minimumQuantity: bulkMinimumQuantity,
  });
}
