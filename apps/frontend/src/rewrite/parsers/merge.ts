import type { ParseIssue } from "@smart-db/contracts";
import { Ok } from "@smart-db/contracts";
import type { MergePartTypesRequest } from "@smart-db/contracts";
import { failParse, isRecord, readOptionalString, readRequiredString, type ParseResult } from "./shared";

export type MergeCommand = MergePartTypesRequest;

export function parseMergeForm(input: unknown): ParseResult<MergeCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const sourcePartTypeId = readRequiredString(
    record,
    "sourcePartTypeId",
    issues,
    "Choose a source part type.",
  );
  const destinationPartTypeId = readRequiredString(
    record,
    "destinationPartTypeId",
    issues,
    "Choose a destination part type.",
  );
  const normalizedAliasLabel = readOptionalString(
    record,
    "aliasLabel",
    issues,
    "Alias labels must be plain text.",
  );

  if (sourcePartTypeId && destinationPartTypeId && sourcePartTypeId === destinationPartTypeId) {
    issues.push({
      path: "destinationPartTypeId",
      message: "Choose two different part types; a part type cannot be merged into itself.",
    });
  }

  if (issues.length > 0) {
    return failParse("admin.mergePartType", issues);
  }

  return Ok({
    sourcePartTypeId: sourcePartTypeId ?? "",
    destinationPartTypeId: destinationPartTypeId ?? "",
    aliasLabel: normalizedAliasLabel,
  });
}
