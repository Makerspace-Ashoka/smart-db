import type { AuthSession } from "@smart-db/contracts";

export interface RequestAuthContext {
  sessionId: string;
  session: AuthSession;
}

export interface RequestIdempotencyContext {
  storageKey: string;
  ownsReservation: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    authContext?: RequestAuthContext;
    idempotencyContext?: RequestIdempotencyContext;
  }
}
