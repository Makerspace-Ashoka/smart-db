import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import {
  authCallbackQuerySchema,
  authLoginQuerySchema,
  ForbiddenError,
  logoutResponseSchema,
  parseWithSchema,
} from "@smart-db/contracts";
import { AuthService } from "../auth/auth-service.js";
import {
  authRequestCookieName,
  sessionCookieOptions,
  transientCookieOptions,
} from "../auth/auth-cookies.js";
import type { AppConfig } from "../config.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  config: AppConfig,
  authService: AuthService,
  requireAuth: preHandlerAsyncHookHandler,
): Promise<void> {
  app.get("/api/auth/login", async (request, reply) => {
    const query = parseWithSchema(authLoginQuerySchema, request.query, "auth login query");
    const result = await authService.startLogin(query.returnTo);
    reply.setCookie(
      authRequestCookieName,
      result.authRequest,
      transientCookieOptions(config.publicBaseUrl),
    );
    return reply.redirect(result.authorizationUrl);
  });

  app.get("/api/auth/callback", async (request, reply) => {
    try {
      const query = parseWithSchema(authCallbackQuerySchema, request.query, "auth callback query");
      const result = await authService.completeLogin(
        query,
        request.cookies[authRequestCookieName],
      );
      reply.clearCookie(
        authRequestCookieName,
        transientCookieOptions(config.publicBaseUrl),
      );
      reply.setCookie(
        config.sessionCookieName,
        result.sessionId,
        sessionCookieOptions(config.publicBaseUrl, result.session.expiresAt),
      );
      return reply.redirect(result.redirectTo);
    } catch (error) {
      // Surface the real reason in the logs. Previously the callback swallowed
      // every failure and only showed the user a generic "Sign-in failed",
      // making the OAuth round-trip impossible to diagnose. The error message
      // (e.g. token-exchange status, nonce/state mismatch, JWKS failure) is
      // structured and carries no bearer tokens, so it is safe to log.
      request.log.error(
        { err: error, hasAuthRequestCookie: Boolean(request.cookies[authRequestCookieName]) },
        "auth callback failed",
      );
      reply.clearCookie(
        authRequestCookieName,
        transientCookieOptions(config.publicBaseUrl),
      );
      const url = new URL(config.frontendOrigin);
      url.searchParams.set("authError", "Sign-in failed. Please try again.");
      return reply.redirect(url.toString());
    }
  });

  app.get("/api/auth/session", { preHandler: requireAuth }, async (request) => {
    return request.authContext!.session;
  });

  app.post("/api/auth/logout", async (request, reply) => {
    if (request.headers.origin !== config.frontendOrigin) {
      throw new ForbiddenError("Cross-origin logout requests are not allowed.");
    }
    const result = await authService.logout(request.cookies[config.sessionCookieName]);
    reply.clearCookie(
      config.sessionCookieName,
      sessionCookieOptions(config.publicBaseUrl, null),
    );
    return parseWithSchema(
      logoutResponseSchema,
      { ok: true, redirectUrl: result.redirectUrl },
      "logout response",
    );
  });
}
