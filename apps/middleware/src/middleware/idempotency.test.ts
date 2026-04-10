import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import type { preHandlerAsyncHookHandler } from "fastify";
import { isApplicationError } from "@smart-db/contracts";
import { applyMigrations } from "../db/migrations.js";
import { createIdempotencyHooks } from "./idempotency.js";

describe("idempotency middleware", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("PRAGMA journal_mode = WAL;");
    applyMigrations(db);
  });

  it("returns cached responses for duplicate keys within the same session", async () => {
    let callCount = 0;
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/test",
      protectedIdempotentRoute(idempotency),
      async () => ({ count: ++callCount }),
    );
    await app.ready();

    const first = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-1",
        "x-test-session": "session-a",
      },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ count: 1 });

    const second = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-1",
        "x-test-session": "session-a",
      },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ count: 1 });
    expect(second.headers["x-idempotency-replay"]).toBe("true");
  });

  it("proceeds normally when no idempotency key is present", async () => {
    let callCount = 0;
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/test",
      protectedIdempotentRoute(idempotency),
      async () => ({ count: ++callCount }),
    );
    await app.ready();

    const first = await app.inject({
      method: "POST",
      url: "/test",
      headers: { "x-test-session": "session-a" },
    });
    expect(first.json()).toEqual({ count: 1 });

    const second = await app.inject({
      method: "POST",
      url: "/test",
      headers: { "x-test-session": "session-a" },
    });
    expect(second.json()).toEqual({ count: 2 });
  });

  it("does not cache error responses", async () => {
    let callCount = 0;
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/test",
      protectedIdempotentRoute(idempotency),
      async (_req, reply) => {
        callCount++;
        if (callCount === 1) {
          reply.code(409);
          return { error: "conflict" };
        }
        return { result: "ok" };
      },
    );
    await app.ready();

    const first = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-err",
        "x-test-session": "session-a",
      },
    });
    expect(first.statusCode).toBe(409);

    const second = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-err",
        "x-test-session": "session-a",
      },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ result: "ok" });
  });

  it("does not replay cached responses across sessions", async () => {
    let callCount = 0;
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/test",
      protectedIdempotentRoute(idempotency),
      async (request) => ({
        count: ++callCount,
        sessionId: request.authContext?.sessionId ?? null,
      }),
    );
    await app.ready();

    const first = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-auth",
        "x-test-session": "session-a",
      },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-auth",
        "x-test-session": "session-b",
      },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ count: 2, sessionId: "session-b" });
    expect(second.headers["x-idempotency-replay"]).toBeUndefined();
  });

  it("does not replay cached responses when authentication is absent", async () => {
    let callCount = 0;
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/test",
      {
        preHandler: [injectTestSession, idempotency.preHandler],
        onSend: [idempotency.onSend],
      },
      async () => ({ count: ++callCount }),
    );
    await app.ready();

    const first = await app.inject({
      method: "POST",
      url: "/test",
      headers: { "x-idempotency-key": "key-authless" },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ count: 1 });

    const second = await app.inject({
      method: "POST",
      url: "/test",
      headers: { "x-idempotency-key": "key-authless" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ count: 2 });
    expect(second.headers["x-idempotency-replay"]).toBeUndefined();
  });

  it("does not execute concurrent same-key requests twice", async () => {
    let callCount = 0;
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const enteredGate = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/test",
      protectedIdempotentRoute(idempotency),
      async () => {
        callCount += 1;
        entered();
        await gate;
        return { count: callCount };
      },
    );
    await app.ready();

    const firstPromise = app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-race",
        "x-test-session": "session-a",
      },
    });

    await enteredGate;

    const second = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-race",
        "x-test-session": "session-a",
      },
    });

    expect(second.statusCode).toBe(409);
    expect(callCount).toBe(1);

    release();
    const first = await firstPromise;
    expect(first.statusCode).toBe(200);

    const replay = await app.inject({
      method: "POST",
      url: "/test",
      headers: {
        "x-idempotency-key": "key-race",
        "x-test-session": "session-a",
      },
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({ count: 1 });
    expect(replay.headers["x-idempotency-replay"]).toBe("true");
  });

  it("does not replay cached responses across endpoints or payloads", async () => {
    let oneCount = 0;
    let twoCount = 0;
    const app = createTestApp();
    const idempotency = createIdempotencyHooks(db);

    app.post(
      "/one",
      protectedIdempotentRoute(idempotency),
      async (request) => ({ count: ++oneCount, payload: request.body }),
    );
    app.post(
      "/two",
      protectedIdempotentRoute(idempotency),
      async (request) => ({ count: ++twoCount, payload: request.body }),
    );
    await app.ready();

    const first = await app.inject({
      method: "POST",
      url: "/one",
      headers: {
        "x-idempotency-key": "key-shared",
        "x-test-session": "session-a",
      },
      payload: { code: "QR-1", location: "Shelf A" },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/two",
      headers: {
        "x-idempotency-key": "key-shared",
        "x-test-session": "session-a",
      },
      payload: { code: "QR-1", location: "Shelf A" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ count: 1, payload: { code: "QR-1", location: "Shelf A" } });
    expect(second.headers["x-idempotency-replay"]).toBeUndefined();

    const third = await app.inject({
      method: "POST",
      url: "/one",
      headers: {
        "x-idempotency-key": "key-shared",
        "x-test-session": "session-a",
      },
      payload: { code: "QR-1", location: "Shelf B" },
    });
    expect(third.statusCode).toBe(200);
    expect(third.json()).toEqual({ count: 2, payload: { code: "QR-1", location: "Shelf B" } });
    expect(third.headers["x-idempotency-replay"]).toBeUndefined();
  });
});

const injectTestSession: preHandlerAsyncHookHandler = async (request) => {
  const sessionId = request.headers["x-test-session"];
  if (typeof sessionId !== "string" || !sessionId) {
    return;
  }

  request.authContext = {
    sessionId,
    session: {
      subject: null,
      username: sessionId,
      name: null,
      email: null,
      roles: [],
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    },
  };
};

function protectedIdempotentRoute(idempotency: ReturnType<typeof createIdempotencyHooks>) {
  return {
    preHandler: [injectTestSession, idempotency.preHandler],
    onSend: [idempotency.onSend],
  } as const;
}

function createTestApp() {
  const app = Fastify();
  app.setErrorHandler((error, _request, reply) => {
    if (isApplicationError(error)) {
      reply.status(error.httpStatus).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    reply.status(500).send({ error: "unexpected" });
  });
  return app;
}
