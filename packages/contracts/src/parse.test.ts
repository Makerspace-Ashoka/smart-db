import { z } from "zod";
import { describe, expect, it } from "vitest";
import { ParseInputError, parseWithSchema } from "./index";

describe("parseWithSchema", () => {
  it("returns parsed output when the shape is correct", () => {
    const result = parseWithSchema(
      z.object({
        count: z.number().int().positive(),
      }),
      { count: 2 },
      "count payload",
    );

    expect(result).toEqual({ count: 2 });
  });

  it("throws a ParseInputError with flattened issues when parsing fails", () => {
    expect(() =>
      parseWithSchema(
        z.object({
          nested: z.object({
            count: z.number().int().positive(),
          }),
        }),
        { nested: { count: 0 } },
        "nested payload",
      ),
    ).toThrowError(ParseInputError);

    try {
      parseWithSchema(
        z.object({
          nested: z.object({
            count: z.number().int().positive(),
          }),
        }),
        { nested: { count: 0 } },
        "nested payload",
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ParseInputError);
      expect((error as ParseInputError).issues).toEqual([
        {
          path: "nested.count",
          message: "Number must be greater than 0",
        },
      ]);
    }
  });
});

