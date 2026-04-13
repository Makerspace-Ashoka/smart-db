import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import { authMachine } from "./auth-machine";
import type { RewriteFailure } from "../errors";

const authFailure: RewriteFailure = {
  kind: "auth",
  operation: "session.restore",
  code: "expired",
  message: "Session expired.",
  retryability: "after-user-action",
  details: {
    sessionKnown: true,
  },
};

describe("authMachine", () => {
  it("restores into authenticated state when a session is present", () => {
    const actor = createActor(authMachine).start();

    actor.send({
      type: "SESSION.RESTORED",
      session: {
        subject: "user-1",
        username: "lab-admin",
        name: "Lab Admin",
        email: "lab@example.com",
        roles: ["smartdb.admin"],
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T12:00:00.000Z",
      },
    });

    expect(actor.getSnapshot().value).toBe("authenticated");
    expect(actor.getSnapshot().context.session?.username).toBe("lab-admin");
  });

  it("moves into expired and then back to anonymous after acknowledgement", () => {
    const actor = createActor(authMachine).start();
    actor.send({
      type: "SESSION.RESTORED",
      session: {
        subject: "user-1",
        username: "lab-admin",
        name: "Lab Admin",
        email: "lab@example.com",
        roles: ["smartdb.admin"],
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T12:00:00.000Z",
      },
    });

    actor.send({ type: "SESSION.EXPIRED", failure: authFailure });
    expect(actor.getSnapshot().value).toBe("expired");
    expect(actor.getSnapshot().context.session).toBeNull();

    actor.send({ type: "FAILURE.ACKNOWLEDGED" });
    expect(actor.getSnapshot().value).toBe("anonymous");
  });

  it("handles logout transitions explicitly", () => {
    const actor = createActor(authMachine).start();
    actor.send({
      type: "SESSION.RESTORED",
      session: {
        subject: "user-1",
        username: "labeler",
        name: null,
        email: null,
        roles: ["smartdb.labeler"],
        issuedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: null,
      },
    });

    actor.send({ type: "LOGOUT.REQUESTED" });
    expect(actor.getSnapshot().value).toBe("loggingOut");

    actor.send({ type: "LOGOUT.SUCCEEDED" });
    expect(actor.getSnapshot().value).toBe("anonymous");
    expect(actor.getSnapshot().context.session).toBeNull();
  });
});
