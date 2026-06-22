import { smartDbRoles, type AuthSession } from "@smart-db/contracts";

export function isFrontendDevAuthBypassEnabled(env: ImportMetaEnv = import.meta.env): boolean {
  const value = env.VITE_DEV_AUTH_BYPASS?.trim().toLowerCase();
  return env.DEV && (value === "true" || value === "1");
}

export function createDevAuthSession(now: Date = new Date()): AuthSession {
  return {
    subject: "dev-auth-bypass",
    username: "dev-admin",
    name: "Dev Auth Bypass",
    email: null,
    roles: [smartDbRoles.admin, smartDbRoles.labeler, smartDbRoles.viewer],
    issuedAt: now.toISOString(),
    expiresAt: null,
  };
}

export function isDevAuthSession(session: AuthSession): boolean {
  return session.subject === "dev-auth-bypass";
}
