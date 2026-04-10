import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok, Err } from "@smart-db/contracts";
import { applyMigrations } from "../db/migrations.js";
import { CategoryResolver, extractIdFromIri } from "./category-resolver.js";

function makeDb(): DatabaseSync {
  const directory = mkdtempSync(join(tmpdir(), "smart-db-category-cache-"));
  const db = new DatabaseSync(join(directory, "smart.db"));
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  applyMigrations(db);
  return db;
}

describe("CategoryResolver", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = makeDb();
  });

  it("returns cached categories without remote calls", async () => {
    db.prepare(
      `INSERT INTO partdb_category_cache (path_key, partdb_iri, cached_at) VALUES (?, ?, ?)`,
    ).run("Electronics/Resistors", "/api/categories/42", "2026-01-01T00:00:00.000Z");

    const categories = {
      findByNameAndParent: vi.fn(),
      create: vi.fn(),
    } as never;

    const resolver = new CategoryResolver(db, categories);
    await expect(resolver.resolveOrCreate(["Electronics", "Resistors"])).resolves.toEqual(
      Ok({ iri: "/api/categories/42", id: 42 }),
    );
    expect(categories.findByNameAndParent).not.toHaveBeenCalled();
  });

  it("walks the path, finding existing parents and creating missing children", async () => {
    const categories = {
      findByNameAndParent: vi
        .fn()
        .mockResolvedValueOnce(Ok({ "@id": "/api/categories/10", id: 10, name: "Electronics" }))
        .mockResolvedValueOnce(Ok(null))
        .mockResolvedValueOnce(Ok(null)),
      create: vi
        .fn()
        .mockResolvedValueOnce(Ok({ "@id": "/api/categories/11", id: 11, name: "Resistors" }))
        .mockResolvedValueOnce(Ok({ "@id": "/api/categories/12", id: 12, name: "SMD" })),
    } as never;

    const resolver = new CategoryResolver(db, categories);
    await expect(
      resolver.resolveOrCreate(["Electronics", "Resistors", "SMD"]),
    ).resolves.toEqual(Ok({ iri: "/api/categories/12", id: 12 }));

    expect(categories.findByNameAndParent).toHaveBeenNthCalledWith(1, "Electronics", null);
    expect(categories.findByNameAndParent).toHaveBeenNthCalledWith(2, "Resistors", "/api/categories/10");
    expect(categories.findByNameAndParent).toHaveBeenNthCalledWith(3, "SMD", "/api/categories/11");
  });

  it("returns the first resource error without mutating later path segments", async () => {
    const categories = {
      findByNameAndParent: vi.fn().mockResolvedValue(
        Err({ kind: "network", message: "reset", cause: new Error("reset"), retryable: true }),
      ),
      create: vi.fn(),
    } as never;

    const resolver = new CategoryResolver(db, categories);
    const result = await resolver.resolveOrCreate(["Electronics"]);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "network" },
    });
    expect(categories.create).not.toHaveBeenCalled();
  });
});

describe("extractIdFromIri", () => {
  it("extracts the numeric suffix from a Part-DB iri", () => {
    expect(extractIdFromIri("/api/categories/42")).toBe(42);
  });
});
