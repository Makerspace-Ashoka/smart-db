import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { applyMigrations } from "../db/migrations.js";
import { PartDbOutbox } from "./partdb-outbox.js";

function makeDb(): DatabaseSync {
  const directory = mkdtempSync(join(tmpdir(), "smart-db-outbox-"));
  const db = new DatabaseSync(join(directory, "smart.db"));
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  applyMigrations(db);
  return db;
}

describe("PartDbOutbox", () => {
  it("deduplicates equivalent operations by idempotency key", () => {
    const db = makeDb();
    const outbox = new PartDbOutbox(db);

    const first = outbox.enqueue(
      {
        kind: "create_category",
        payload: { path: ["Electronics"], parentIri: null },
        target: null,
        dependsOnId: null,
      },
      "corr-1",
    );
    const second = outbox.enqueue(
      {
        kind: "create_category",
        payload: { path: ["Electronics"], parentIri: null },
        target: null,
        dependsOnId: null,
      },
      "corr-1",
    );

    expect(second).toBe(first);
    expect(outbox.listByCorrelation("corr-1")).toHaveLength(1);
  });

  it("claims only dependency-ready rows and expires stale leases", () => {
    const db = makeDb();
    const outbox = new PartDbOutbox(db);

    const parent = outbox.enqueue(
      {
        kind: "create_category",
        payload: { path: ["Electronics"], parentIri: null },
        target: null,
        dependsOnId: null,
      },
      "corr-2",
    );
    const child = outbox.enqueue(
      {
        kind: "create_part",
        payload: {
          name: "Arduino Uno",
          categoryIri: null,
          unitIri: null,
          description: "",
          tags: [],
          needsReview: false,
          minAmount: null,
        },
        target: {
          table: "part_types",
          rowId: "part-1",
          column: "partdb_part_id",
        },
        dependsOnId: parent,
      },
      "corr-2",
    );

    const firstClaim = outbox.claimBatch({
      nowIso: "2030-01-01T00:00:00.000Z",
      batchSize: 10,
      leaseDurationMs: 1000,
    });
    expect(firstClaim.map((row) => row.id)).toEqual([parent]);

    outbox.markDelivered(parent, { iri: "/api/categories/1", body: { ok: true } }, "2026-01-01T00:00:01.000Z");

    const secondClaim = outbox.claimBatch({
      nowIso: "2030-01-01T00:00:02.000Z",
      batchSize: 10,
      leaseDurationMs: 1000,
    });
    expect(secondClaim.map((row) => row.id)).toEqual([child]);
  });

  it("stores delivery and failure metadata durably", () => {
    const db = makeDb();
    const outbox = new PartDbOutbox(db);

    const id = outbox.enqueue(
      {
        kind: "create_storage_location",
        payload: { name: "Shelf A" },
        target: null,
        dependsOnId: null,
      },
      "corr-3",
    );

    outbox.markFailed(
      id,
      { kind: "network", message: "reset" },
      "failed",
      "2026-01-02T00:00:00.000Z",
      "2026-01-01T23:59:30.000Z",
    );
    let row = outbox.getById(id);
    expect(row).toMatchObject({
      status: "failed",
      nextAttemptAt: "2026-01-02T00:00:00.000Z",
      lastFailureAt: "2026-01-01T23:59:30.000Z",
    });

    outbox.markDelivered(id, { iri: "/api/storage_locations/5", body: { id: 5 } }, "2026-01-02T00:00:01.000Z");
    row = outbox.getById(id);
    expect(row).toMatchObject({
      status: "delivered",
      responseIri: "/api/storage_locations/5",
      completedAt: "2026-01-02T00:00:01.000Z",
    });
  });
});
