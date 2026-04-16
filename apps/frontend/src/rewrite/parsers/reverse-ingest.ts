import type { ParseIssue, ReverseIngestAssignmentRequest } from "@smart-db/contracts";
import { Ok } from "@smart-db/contracts";
import {
  failParse,
  isRecord,
  readLiteral,
  readRequiredString,
  type ParseResult,
} from "./shared";

export type ReverseIngestCommand = ReverseIngestAssignmentRequest;

export function parseReverseIngestForm(input: unknown): ParseResult<ReverseIngestCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const qrCode = readRequiredString(record, "qrCode", issues, "Choose the ingested QR/Data Matrix to reverse.");
  const assignedKind = readLiteral(
    record,
    "assignedKind",
    ["instance", "bulk"] as const,
    issues,
    "Choose the ingested entity to reverse.",
  );
  const assignedId = readRequiredString(record, "assignedId", issues, "Choose the ingested entity to reverse.");
  const reason = readRequiredString(record, "reason", issues, "Explain why this ingest must be reversed.");

  if (issues.length > 0 || !qrCode || !assignedKind || !assignedId || !reason) {
    return failParse("correction.reverseIngest", issues);
  }

  return Ok({
    qrCode,
    assignedKind,
    assignedId,
    reason,
  });
}
