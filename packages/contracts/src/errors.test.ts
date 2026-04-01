import { describe, expect, it } from "vitest";
import {
  ApplicationError,
  ConflictError,
  IntegrationError,
  InvariantError,
  NotFoundError,
  ParseInputError,
  isApplicationError,
} from "./index";

describe("application errors", () => {
  it("builds structured parse errors", () => {
    const error = new ParseInputError("assignment request", [
      { path: "qrCode", message: "Required" },
    ]);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe("parse_input");
    expect(error.httpStatus).toBe(400);
    expect(error.details).toEqual({
      context: "assignment request",
      issues: [{ path: "qrCode", message: "Required" }],
    });
  });

  it("builds typed domain and integration failures", () => {
    const notFound = new NotFoundError("QR code", "QR-1001");
    const conflict = new ConflictError("Already assigned.", { qrCode: "QR-1001" });
    const integration = new IntegrationError("Part-DB", "upstream timed out", {
      requestId: "abc",
    });
    const invariant = new InvariantError("Persisted row broke an invariant.", {
      rowId: "123",
    });

    expect(notFound.httpStatus).toBe(404);
    expect(conflict.httpStatus).toBe(409);
    expect(integration.httpStatus).toBe(502);
    expect(invariant.httpStatus).toBe(500);
    expect(isApplicationError(notFound)).toBe(true);
    expect(isApplicationError(new Error("plain"))).toBe(false);
  });
});

