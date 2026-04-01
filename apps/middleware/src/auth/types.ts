import type { AuthSession } from "@smart-db/contracts";

export interface RequestAuthContext {
  session: AuthSession;
}

declare module "fastify" {
  interface FastifyRequest {
    authContext?: RequestAuthContext;
  }
}
