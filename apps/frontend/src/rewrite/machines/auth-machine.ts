import type { AuthSession } from "@smart-db/contracts";
import { assign, setup } from "xstate";
import type { RewriteFailure } from "../errors";

export interface AuthMachineContext {
  readonly session: AuthSession | null;
  readonly failure: RewriteFailure | null;
  readonly redirectUrl: string | null;
}

export type AuthMachineEvent =
  | { readonly type: "SESSION.RESTORED"; readonly session: AuthSession }
  | { readonly type: "SESSION.MISSING" }
  | { readonly type: "LOGIN.REQUESTED"; readonly redirectUrl: string }
  | { readonly type: "LOGIN.REDIRECTED" }
  | { readonly type: "SESSION.EXPIRED"; readonly failure: RewriteFailure }
  | { readonly type: "LOGOUT.REQUESTED" }
  | { readonly type: "LOGOUT.SUCCEEDED" }
  | { readonly type: "LOGOUT.FAILED"; readonly failure: RewriteFailure }
  | { readonly type: "AUTH.FAILED"; readonly failure: RewriteFailure }
  | { readonly type: "FAILURE.ACKNOWLEDGED" };

export const authMachine = setup({
  types: {
    context: {} as AuthMachineContext,
    events: {} as AuthMachineEvent,
    input: {} as Partial<AuthMachineContext>,
  },
  guards: {
    hasSession: ({ context }) => context.session !== null,
  },
  actions: {
    captureSession: assign({
      session: ({ event }) => (event.type === "SESSION.RESTORED" ? event.session : null),
      failure: () => null,
    }),
    captureFailure: assign({
      failure: ({ event }) =>
        "failure" in event ? event.failure : null,
    }),
    captureRedirect: assign({
      redirectUrl: ({ event }) =>
        event.type === "LOGIN.REQUESTED" ? event.redirectUrl : null,
    }),
    clearFailure: assign({
      failure: () => null,
    }),
    clearSession: assign({
      session: () => null,
    }),
    clearRedirect: assign({
      redirectUrl: () => null,
    }),
  },
}).createMachine({
  id: "auth",
  initial: "bootstrapping",
  context: ({ input }) => ({
    session: input?.session ?? null,
    failure: input?.failure ?? null,
    redirectUrl: input?.redirectUrl ?? null,
  }),
  states: {
    bootstrapping: {
      on: {
        "SESSION.RESTORED": {
          target: "authenticated",
          actions: ["captureSession", "clearRedirect"],
        },
        "SESSION.MISSING": {
          target: "anonymous",
          actions: ["clearSession", "clearFailure", "clearRedirect"],
        },
        "AUTH.FAILED": {
          target: "failure",
          actions: ["clearSession", "captureFailure"],
        },
      },
    },
    anonymous: {
      on: {
        "LOGIN.REQUESTED": {
          target: "redirecting",
          actions: ["captureRedirect", "clearFailure"],
        },
        "SESSION.RESTORED": {
          target: "authenticated",
          actions: ["captureSession", "clearRedirect"],
        },
        "AUTH.FAILED": {
          target: "failure",
          actions: "captureFailure",
        },
      },
    },
    redirecting: {
      on: {
        "LOGIN.REDIRECTED": "anonymous",
        "SESSION.RESTORED": {
          target: "authenticated",
          actions: ["captureSession", "clearRedirect"],
        },
        "AUTH.FAILED": {
          target: "failure",
          actions: ["clearRedirect", "captureFailure"],
        },
      },
    },
    authenticated: {
      on: {
        "LOGOUT.REQUESTED": "loggingOut",
        "SESSION.EXPIRED": {
          target: "expired",
          actions: ["captureFailure", "clearSession"],
        },
        "AUTH.FAILED": {
          target: "failure",
          actions: ["captureFailure", "clearSession"],
        },
      },
    },
    loggingOut: {
      on: {
        "LOGOUT.SUCCEEDED": {
          target: "anonymous",
          actions: ["clearSession", "clearFailure", "clearRedirect"],
        },
        "LOGOUT.FAILED": {
          target: "failure",
          actions: "captureFailure",
        },
      },
    },
    expired: {
      on: {
        "LOGIN.REQUESTED": {
          target: "redirecting",
          actions: ["captureRedirect", "clearFailure"],
        },
        "FAILURE.ACKNOWLEDGED": {
          target: "anonymous",
          actions: ["clearFailure", "clearRedirect"],
        },
      },
    },
    failure: {
      on: {
        "FAILURE.ACKNOWLEDGED": [
          {
            guard: "hasSession",
            target: "authenticated",
            actions: "clearFailure",
          },
          {
            target: "anonymous",
            actions: ["clearFailure", "clearRedirect"],
          },
        ],
        "LOGIN.REQUESTED": {
          target: "redirecting",
          actions: ["captureRedirect", "clearFailure"],
        },
      },
    },
  },
});
