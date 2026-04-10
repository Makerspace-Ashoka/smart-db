export type ApplicationErrorCode =
  | "parse_input"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "integration"
  | "invariant";

export interface ParseIssue {
  path: string;
  message: string;
}

export abstract class ApplicationError extends Error {
  readonly name = this.constructor.name;

  protected constructor(
    readonly code: ApplicationErrorCode,
    readonly httpStatus: number,
    message: string,
    readonly details: Record<string, unknown> = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class ParseInputError extends ApplicationError {
  constructor(
    readonly context: string,
    readonly issues: ParseIssue[],
    options?: ErrorOptions,
  ) {
    super(
      "parse_input",
      400,
      `Could not parse ${context}.`,
      { context, issues },
      options,
    );
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string, identifier: string, options?: ErrorOptions) {
    super(
      "not_found",
      404,
      `${entity} '${identifier}' was not found.`,
      { entity, identifier },
      options,
    );
  }
}

export class UnauthenticatedError extends ApplicationError {
  constructor(message = "Authentication is required.", details: Record<string, unknown> = {}, options?: ErrorOptions) {
    super("unauthenticated", 401, message, details, options);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "You do not have permission to perform this action.", details: Record<string, unknown> = {}, options?: ErrorOptions) {
    super("forbidden", 403, message, details, options);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}, options?: ErrorOptions) {
    super("conflict", 409, message, details, options);
  }
}

export class IntegrationError extends ApplicationError {
  constructor(
    integration: string,
    message: string,
    details: Record<string, unknown> = {},
    options?: ErrorOptions,
  ) {
    super(
      "integration",
      502,
      `${integration} integration failed: ${message}`,
      { integration, ...details },
      options,
    );
  }
}

export class InvariantError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}, options?: ErrorOptions) {
    super("invariant", 500, message, details, options);
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
