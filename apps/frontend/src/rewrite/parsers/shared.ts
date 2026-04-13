import {
  Err,
  Ok,
  type ParseIssue,
  type Result,
  getMeasurementUnitBySymbol,
  instanceStatuses,
  parseCategoryPathInput,
  describeCategoryPathParseError,
  type MeasurementUnit,
  type InstanceStatus,
} from "@smart-db/contracts";
import { createParseFailure, type OperationName, type ParseFailureSource, type RewriteFailure } from "../errors";

export type ParseResult<T> = Result<T, RewriteFailure>;

type NumericConstraint = {
  readonly integer?: boolean;
  readonly positive?: boolean;
  readonly nonnegative?: boolean;
  readonly max?: number;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function issue(path: string, message: string): ParseIssue {
  return { path, message };
}

export function failParse(
  operation: OperationName,
  issues: readonly ParseIssue[],
  source: ParseFailureSource = "form",
): ParseResult<never> {
  return Err(createParseFailure(operation, source, issues));
}

export function readRequiredString(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message: string,
): string | null {
  const value = record[field];
  if (typeof value !== "string") {
    issues.push(issue(field, message));
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    issues.push(issue(field, message));
    return null;
  }

  return trimmed;
}

export function readOptionalString(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message = "Enter plain text.",
): string | null {
  const value = record[field];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    issues.push(issue(field, message));
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readLiteral<TValues extends readonly string[]>(
  record: Record<string, unknown>,
  field: string,
  allowed: TValues,
  issues: ParseIssue[],
  message: string,
): TValues[number] | null {
  const value = record[field];
  if (typeof value !== "string") {
    issues.push(issue(field, message));
    return null;
  }

  const trimmed = value.trim();
  if (!allowed.includes(trimmed as TValues[number])) {
    issues.push(issue(field, message));
    return null;
  }

  return trimmed as TValues[number];
}

export function readBoolean(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message: string,
): boolean | null {
  const value = record[field];
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  issues.push(issue(field, message));
  return null;
}

export function readRequiredNumber(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message: string,
  constraint: NumericConstraint = {},
): number | null {
  const parsed = parseNumberValue(record[field]);
  if (parsed === null) {
    issues.push(issue(field, message));
    return null;
  }

  if (constraint.integer && !Number.isInteger(parsed)) {
    issues.push(issue(field, message));
    return null;
  }

  if (constraint.positive && parsed <= 0) {
    issues.push(issue(field, message));
    return null;
  }

  if (constraint.nonnegative && parsed < 0) {
    issues.push(issue(field, message));
    return null;
  }

  if (constraint.max !== undefined && parsed > constraint.max) {
    issues.push(issue(field, message));
    return null;
  }

  return parsed;
}

export function readOptionalNumber(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message: string,
  constraint: NumericConstraint = {},
): number | null {
  const value = record[field];
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return readRequiredNumber(record, field, issues, message, constraint);
}

export function readMeasurementUnit(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message: string,
): MeasurementUnit | null {
  const symbol = readRequiredString(record, field, issues, message);
  if (!symbol) {
    return null;
  }

  const unit = getMeasurementUnitBySymbol(symbol);
  if (!unit) {
    issues.push(issue(field, message));
    return null;
  }

  return unit;
}

export function readInstanceStatus(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
  message: string,
  fallback: InstanceStatus = "available",
): InstanceStatus | null {
  const value = record[field];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return readLiteral(record, field, instanceStatuses, issues, message);
}

export function readCategoryPath(
  record: Record<string, unknown>,
  field: string,
  issues: ParseIssue[],
): string | null {
  const category = readRequiredString(
    record,
    field,
    issues,
    "Category is required.",
  );
  if (!category) {
    return null;
  }

  const parsed = parseCategoryPathInput(category);
  if (!parsed.ok) {
    issues.push(issue(field, describeCategoryPathParseError(parsed.error)));
    return null;
  }

  return category;
}

function parseNumberValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
