import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import {
  parseWithSchema,
  partDbSyncDrainResponseSchema,
  partDbSyncFailureSchema,
  partDbSyncStatusResponseSchema,
} from "@smart-db/contracts";
import type { PartDbOutbox } from "../outbox/partdb-outbox.js";
import type { PartDbOutboxWorker } from "../outbox/partdb-worker.js";

interface PartDbSyncServices {
  enabled: boolean;
  outbox: PartDbOutbox | null;
  worker: PartDbOutboxWorker | null;
}

export async function registerPartDbAdminRoutes(
  app: FastifyInstance,
  services: PartDbSyncServices,
  requireAdmin: preHandlerAsyncHookHandler,
): Promise<void> {
  app.get("/api/partdb/sync/status", { preHandler: requireAdmin }, async () =>
    parseWithSchema(
      partDbSyncStatusResponseSchema,
      services.enabled && services.outbox
        ? { enabled: true, ...services.outbox.getStatusSummary() }
        : { enabled: false, pending: 0, inFlight: 0, failedLast24h: 0, deadTotal: 0 },
      "partdb sync status",
    ),
  );

  app.get("/api/partdb/sync/failures", { preHandler: requireAdmin }, async () =>
    (services.outbox?.listFailures() ?? []).map((row) =>
      parseWithSchema(
        partDbSyncFailureSchema,
        {
          id: row.id,
          operation: row.operation,
          status: row.status === "dead" ? "dead" : "failed",
          targetTable: row.targetTable,
          targetRowId: row.targetRowId,
          attemptCount: row.attemptCount,
          nextAttemptAt: row.nextAttemptAt,
          lastError: row.lastErrorJson ? JSON.parse(row.lastErrorJson) : null,
          createdAt: row.createdAt,
        },
        "partdb sync failure",
      ),
    ),
  );

  app.post("/api/partdb/sync/retry/:id", { preHandler: requireAdmin }, async (request) => {
    const params = request.params as { id: string };
    services.outbox?.retry(params.id);
    return { ok: true as const };
  });

  app.post("/api/partdb/sync/drain", { preHandler: requireAdmin }, async () =>
    parseWithSchema(
      partDbSyncDrainResponseSchema,
      services.worker ? await services.worker.tick() : { claimed: 0, delivered: 0, failed: 0 },
      "partdb sync drain response",
    ),
  );
}
