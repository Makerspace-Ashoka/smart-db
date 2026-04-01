import type { DatabaseSync } from "node:sqlite";
import { InvariantError, isApplicationError } from "@smart-db/contracts";
import cors from "@fastify/cors";
import Fastify, { type preHandlerAsyncHookHandler } from "fastify";
import { config, type AppConfig } from "./config.js";
import { AuthService } from "./auth/auth-service.js";
import "./auth/types.js";
import { createDatabase } from "./db/database.js";
import { registerIdempotencyHooks } from "./middleware/idempotency.js";
import { PartDbClient } from "./partdb/partdb-client.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerInventoryRoutes } from "./routes/inventory-routes.js";
import { InventoryService } from "./services/inventory-service.js";

interface BuildServerOptions {
  configOverride?: AppConfig;
  inventoryService?: InventoryService;
  db?: DatabaseSync;
}

export async function buildServer(options: BuildServerOptions = {}) {
  const activeConfig = options.configOverride ?? config;
  const partDbClient = new PartDbClient(activeConfig.partDb);
  const authService = new AuthService(partDbClient);
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : {
            redact: {
              paths: [
                "req.headers.authorization",
                "request.headers.authorization",
                "headers.authorization",
              ],
              censor: "[REDACTED]",
            },
          },
  });

  await app.register(cors, {
    origin: activeConfig.frontendOrigin,
  });

  const db = options.db ?? createDatabase(activeConfig.dataPath);
  const inventoryService =
    options.inventoryService ??
    new InventoryService(db, partDbClient);

  registerIdempotencyHooks(app, db);

  const requireAuth: preHandlerAsyncHookHandler = async (request) => {
    const apiToken = authService.extractBearerToken(request.headers.authorization);
    const session = await authService.authenticateApiToken(apiToken);
    request.authContext = {
      session,
      partDbToken: apiToken,
    };
  };

  await registerAuthRoutes(app, authService, requireAuth);
  await registerInventoryRoutes(app, inventoryService, requireAuth);

  app.setErrorHandler((error, _request, reply) => {
    const applicationError = isApplicationError(error)
      ? error
      : new InvariantError("Unhandled middleware failure.", {}, { cause: error });

    reply.status(applicationError.httpStatus).send({
      error: {
        code: applicationError.code,
        message: applicationError.message,
        details: applicationError.details,
      },
    });
  });

  return app;
}
