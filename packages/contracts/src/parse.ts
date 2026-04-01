import { z } from "zod";
import { ParseInputError, type ParseIssue } from "./errors.js";

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
  context: string,
): z.output<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ParseInputError(context, mapIssues(parsed.error.issues));
  }

  return parsed.data;
}

function mapIssues(issues: z.ZodIssue[]): ParseIssue[] {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

