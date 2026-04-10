import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  onSendHookHandler,
  preHandlerAsyncHookHandler,
} from "fastify";
import { ConflictError } from "@smart-db/contracts";

const CLEANUP_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const PENDING_RESPONSE = "__PENDING__";

export interface IdempotencyHooks {
  preHandler: preHandlerAsyncHookHandler;
  onSend: onSendHookHandler;
}

export function createIdempotencyHooks(db: DatabaseSync): IdempotencyHooks {
  const lookup = db.prepare(
    "SELECT response_json FROM idempotency_keys WHERE key = ?",
  );
  const insert = db.prepare(
    "INSERT OR IGNORE INTO idempotency_keys (key, endpoint, response_json, created_at) VALUES (?, ?, ?, ?)",
  );
  const update = db.prepare(
    "UPDATE idempotency_keys SET response_json = ?, created_at = ? WHERE key = ?",
  );
  const remove = db.prepare(
    "DELETE FROM idempotency_keys WHERE key = ?",
  );
  const cleanup = db.prepare(
    "DELETE FROM idempotency_keys WHERE created_at < ?",
  );

  const preHandler: preHandlerAsyncHookHandler = async (request, reply) => {
    if (request.method !== "POST") return;

    const key = request.headers["x-idempotency-key"];
    if (typeof key !== "string" || !key) return;

    const scope = sessionScope(request);
    if (!scope) return;

    const requestStorageKey = storageKey(request, scope, key);
    const inserted = insert.run(
      requestStorageKey,
      request.url,
      PENDING_RESPONSE,
      new Date().toISOString(),
    );
    if (inserted.changes > 0) {
      request.idempotencyContext = {
        storageKey: requestStorageKey,
        ownsReservation: true,
      };
      return;
    }

    const row = lookup.get(requestStorageKey) as { response_json: string } | undefined;
    if (!row) return;

    if (row.response_json === PENDING_RESPONSE) {
      throw new ConflictError("A request with this idempotency key is already in progress.", {
        idempotencyKey: key,
      });
    }

    const cached = JSON.parse(row.response_json) as { statusCode: number; body: unknown };
    reply.code(cached.statusCode);
    reply.header("x-idempotency-replay", "true");
    await reply.send(cached.body);
  };

  const onSend: onSendHookHandler = async (request, reply, payload) => {
    if (request.method !== "POST") return payload;

    const key = request.headers["x-idempotency-key"];
    if (typeof key !== "string" || !key) return payload;

    if (request.idempotencyContext?.ownsReservation) {
      const parsedPayload = parsePayload(payload);
      if (reply.statusCode >= 200 && reply.statusCode < 300 && parsedPayload !== undefined) {
        const cached = JSON.stringify({ statusCode: reply.statusCode, body: parsedPayload });
        update.run(
          cached,
          new Date().toISOString(),
          request.idempotencyContext.storageKey,
        );
      } else {
        remove.run(request.idempotencyContext.storageKey);
      }
    }

    const threshold = new Date(Date.now() - CLEANUP_THRESHOLD_MS).toISOString();
    cleanup.run(threshold);

    return payload;
  };

  return {
    preHandler,
    onSend,
  };
}

function sessionScope(request: Parameters<preHandlerAsyncHookHandler>[0]): string | null {
  return request.authContext?.sessionId ?? null;
}

function storageKey(
  request: Parameters<preHandlerAsyncHookHandler>[0],
  scope: string,
  key: string,
): string {
  return createHash("sha256")
    .update(
      `${scope}\n${request.method}\n${request.url}\n${stableStringify(request.body)}\n${key}`,
    )
    .digest("hex");
}

function parsePayload(payload: unknown): unknown | undefined {
  if (typeof payload !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
    );
  }

  return value ?? null;
}
