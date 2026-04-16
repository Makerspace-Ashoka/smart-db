import type { ParseIssue, ReassignEntityPartTypeRequest } from "@smart-db/contracts";
import { Ok } from "@smart-db/contracts";
import {
  failParse,
  isRecord,
  readLiteral,
  readRequiredString,
  type ParseResult,
} from "./shared";

export type ReassignPartTypeCommand = ReassignEntityPartTypeRequest;

export function parseReassignPartTypeForm(input: unknown): ParseResult<ReassignPartTypeCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const targetType = readLiteral(
    record,
    "targetType",
    ["instance", "bulk"] as const,
    issues,
    "Choose the ingested entity to correct.",
  );
  const targetId = readRequiredString(record, "targetId", issues, "Choose the ingested entity to correct.");
  const fromPartTypeId = readRequiredString(record, "fromPartTypeId", issues, "Current part type is required.");
  const toPartTypeId = readRequiredString(record, "toPartTypeId", issues, "Choose the replacement part type.");
  const reason = readRequiredString(record, "reason", issues, "Explain why this correction is needed.");

  if (fromPartTypeId && toPartTypeId && fromPartTypeId === toPartTypeId) {
    issues.push({
      path: "toPartTypeId",
      message: "Current and replacement part types must be different.",
    });
  }

  if (issues.length > 0 || !targetType || !targetId || !fromPartTypeId || !toPartTypeId || !reason) {
    return failParse("correction.reassignEntityPartType", issues);
  }

  return Ok({
    targetType,
    targetId,
    fromPartTypeId,
    toPartTypeId,
    reason,
  });
}
