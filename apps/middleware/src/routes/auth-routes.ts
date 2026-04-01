import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { loginRequestSchema, logoutResponseSchema, parseWithSchema } from "@smart-db/contracts";
import { AuthService } from "../auth/auth-service.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  authService: AuthService,
  requireAuth: preHandlerAsyncHookHandler,
): Promise<void> {
  app.post("/api/auth/login", async (request) => {
    const command = parseWithSchema(loginRequestSchema, request.body, "login request");
    const session = await authService.authenticateApiToken(command.apiToken);
    return { session };
  });

  app.get("/api/auth/session", { preHandler: requireAuth }, async (request) => {
    return request.authContext!.session;
  });

  app.post("/api/auth/logout", { preHandler: requireAuth }, async () =>
    parseWithSchema(logoutResponseSchema, { ok: true }, "logout response"),
  );
}
