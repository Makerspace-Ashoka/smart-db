import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { OutboxOperation, OutboxRow, OutboxStatus } from "./outbox-types.js";

type SqlRow = Record<string, unknown>;

interface ClaimOptions {
  nowIso?: string;
  batchSize?: number;
  leaseDurationMs?: number;
}

export class PartDbOutbox {
  constructor(private readonly db: DatabaseSync) {}

  enqueue(operation: OutboxOperation, correlationId: string): string {
    const idempotencyKey = computeIdempotencyKey(operation);
    const id = randomUUID();
    const nowIso = new Date().toISOString();

    this.db.prepare(`
      INSERT OR IGNORE INTO partdb_outbox
        (id, idempotency_key, correlation_id, operation, payload_json,
         depends_on_id, target_table, target_row_id, target_column,
         status, attempt_count, max_attempts, next_attempt_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 10, ?, ?)
    `).run(
      id,
      idempotencyKey,
      correlationId,
      operation.kind,
      JSON.stringify(operation.payload),
      operation.dependsOnId,
      operation.target?.table ?? null,
      operation.target?.rowId ?? null,
      operation.target?.column ?? null,
      nowIso,
      nowIso,
    );

    const existing = this.db.prepare(
      `SELECT id FROM partdb_outbox WHERE idempotency_key = ?`,
    ).get(idempotencyKey) as { id: string };

    return existing.id;
  }

  getById(id: string): OutboxRow | null {
    const row = this.db.prepare(`SELECT * FROM partdb_outbox WHERE id = ?`).get(id) as SqlRow | undefined;
    return row ? mapOutboxRow(row) : null;
  }

  listByCorrelation(correlationId: string): OutboxRow[] {
    return this.db
      .prepare(`SELECT * FROM partdb_outbox WHERE correlation_id = ? ORDER BY created_at, id`)
      .all(correlationId)
      .map((row) => mapOutboxRow(row as SqlRow));
  }

  claimBatch(options: ClaimOptions = {}): OutboxRow[] {
    const nowIso = options.nowIso ?? new Date().toISOString();
    const leaseDurationMs = options.leaseDurationMs ?? 30_000;
    const batchSize = options.batchSize ?? 10;
    const leaseExpiresAt = new Date(Date.parse(nowIso) + leaseDurationMs).toISOString();

    this.db.exec("BEGIN");
    try {
      this.db.prepare(`
        UPDATE partdb_outbox
        SET status = 'pending',
            lease_expires_at = NULL,
            leased_at = NULL
        WHERE status = 'leased' AND lease_expires_at < ?
      `).run(nowIso);

      const rows = this.db.prepare(`
        SELECT * FROM partdb_outbox
        WHERE status IN ('pending', 'failed')
          AND next_attempt_at <= ?
          AND (depends_on_id IS NULL OR EXISTS (
            SELECT 1
            FROM partdb_outbox dep
            WHERE dep.id = partdb_outbox.depends_on_id
              AND dep.status = 'delivered'
          ))
        ORDER BY created_at, id
        LIMIT ?
      `).all(nowIso, batchSize) as SqlRow[];

      for (const row of rows) {
        this.db.prepare(`
          UPDATE partdb_outbox
          SET status = 'leased',
              leased_at = ?,
              lease_expires_at = ?,
              attempt_count = attempt_count + 1
          WHERE id = ?
        `).run(nowIso, leaseExpiresAt, String(row.id));
      }

      const claimedRows = rows.map((row) =>
        mapOutboxRow({
          ...row,
          status: "leased",
          leased_at: nowIso,
          lease_expires_at: leaseExpiresAt,
          attempt_count: Number(row.attempt_count) + 1,
        }),
      );
      this.db.exec("COMMIT");
      return claimedRows;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  markDelivered(id: string, response: { iri: string | null; body: unknown }, completedAt: string = new Date().toISOString()): void {
    this.db.prepare(`
      UPDATE partdb_outbox
      SET status = 'delivered',
          response_json = ?,
          response_iri = ?,
          completed_at = ?,
          lease_expires_at = NULL
      WHERE id = ?
    `).run(JSON.stringify(response.body), response.iri, completedAt, id);
  }

  markFailed(id: string, error: unknown, status: Extract<OutboxStatus, "failed" | "dead">, nextAttemptAt: string | null = null): void {
    this.db.prepare(`
      UPDATE partdb_outbox
      SET status = ?,
          next_attempt_at = COALESCE(?, next_attempt_at),
          last_error_json = ?,
          lease_expires_at = NULL
      WHERE id = ?
    `).run(status, nextAttemptAt, JSON.stringify(error), id);
  }
}

function computeIdempotencyKey(operation: OutboxOperation): string {
  const canonical = {
    kind: operation.kind,
    payload: operation.payload,
    target: operation.target,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function mapOutboxRow(row: SqlRow): OutboxRow {
  return {
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    correlationId: String(row.correlation_id),
    operation: String(row.operation) as OutboxRow["operation"],
    payloadJson: String(row.payload_json),
    dependsOnId: stringOrNull(row.depends_on_id),
    targetTable: stringOrNull(row.target_table) as OutboxRow["targetTable"],
    targetRowId: stringOrNull(row.target_row_id),
    targetColumn: stringOrNull(row.target_column) as OutboxRow["targetColumn"],
    status: String(row.status) as OutboxStatus,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    leaseExpiresAt: stringOrNull(row.lease_expires_at),
    nextAttemptAt: String(row.next_attempt_at),
    lastErrorJson: stringOrNull(row.last_error_json),
    responseJson: stringOrNull(row.response_json),
    responseIri: stringOrNull(row.response_iri),
    createdAt: String(row.created_at),
    leasedAt: stringOrNull(row.leased_at),
    completedAt: stringOrNull(row.completed_at),
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
