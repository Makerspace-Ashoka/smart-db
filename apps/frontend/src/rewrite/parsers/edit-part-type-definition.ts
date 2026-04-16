import type { EditPartTypeDefinitionRequest, ParseIssue } from "@smart-db/contracts";
import { Ok, parseCategoryPathInput, describeCategoryPathParseError } from "@smart-db/contracts";
import {
  failParse,
  isRecord,
  readRequiredString,
  type ParseResult,
} from "./shared";

export type EditPartTypeDefinitionCommand = EditPartTypeDefinitionRequest;

export function parseEditPartTypeDefinitionForm(input: unknown): ParseResult<EditPartTypeDefinitionCommand> {
  const record = isRecord(input) ? input : {};
  const issues: ParseIssue[] = [];

  const partTypeId = readRequiredString(record, "partTypeId", issues, "Choose the shared part type to edit.");
  const expectedUpdatedAt = readRequiredString(record, "expectedUpdatedAt", issues, "Part type version is required.");
  const canonicalName = readRequiredString(record, "canonicalName", issues, "Give the shared part type a canonical name.");
  const category = readRequiredString(record, "category", issues, "Choose the category path for the shared part type.");
  const reason = readRequiredString(record, "reason", issues, "Explain why this shared part type is being edited.");

  if (category) {
    const parsed = parseCategoryPathInput(category);
    if (!parsed.ok) {
      issues.push({
        path: "category",
        message: describeCategoryPathParseError(parsed.error),
      });
    }
  }

  if (issues.length > 0 || !partTypeId || !expectedUpdatedAt || !canonicalName || !category || !reason) {
    return failParse("correction.editPartTypeDefinition", issues);
  }

  return Ok({
    partTypeId,
    expectedUpdatedAt,
    canonicalName,
    category,
    reason,
  });
}
