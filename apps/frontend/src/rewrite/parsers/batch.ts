import type { ParseIssue } from "@smart-db/contracts";
import { Ok } from "@smart-db/contracts";
import type { RegisterQrBatchRequest } from "@smart-db/contracts";
import { failParse, isRecord, readOptionalString, readRequiredNumber, readRequiredString, type ParseResult } from "./shared";

export type BatchCommand = RegisterQrBatchRequest;

const prefixPattern = /^[A-Za-z0-9_-]+$/;

export function parseBatchForm(input: unknown): ParseResult<BatchCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const prefix = readOptionalString(record, "prefix", issues) ?? "QR";
  if (!prefixPattern.test(prefix)) {
    issues.push({
      path: "prefix",
      message: "Prefix may contain only letters, numbers, hyphens, and underscores.",
    });
  }

  const startNumber = readRequiredNumber(
    record,
    "startNumber",
    issues,
    "Start number must be zero or greater.",
    { integer: true, nonnegative: true },
  );
  const count = readRequiredNumber(
    record,
    "count",
    issues,
    "Batch size must be between 1 and 500.",
    { integer: true, positive: true, max: 500 },
  );

  if (issues.length > 0) {
    return failParse("admin.registerBatch", issues);
  }

  return Ok({
    prefix,
    startNumber: startNumber ?? 0,
    count: count ?? 0,
  });
}
