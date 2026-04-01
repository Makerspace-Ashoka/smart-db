import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  configEnvironmentSchema,
  parseWithSchema,
  type ConfigEnvironment,
} from "@smart-db/contracts";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
export function loadEnvironmentFileIfPresent(path: string = envPath): void {
  if (existsSync(path)) {
    process.loadEnvFile?.(path);
  }
}
loadEnvironmentFileIfPresent();

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
export interface AppConfig {
  port: number;
  frontendOrigin: string;
  dataPath: string;
  partDb: {
    baseUrl: string | null;
    publicBaseUrl: string | null;
  };
}

export function parseConfig(environment: Partial<Record<keyof ConfigEnvironment, string | number | undefined>>): AppConfig {
  const parsedEnvironment = parseWithSchema(
    configEnvironmentSchema,
    environment,
    "middleware environment",
  );

  return {
    port: parsedEnvironment.PORT,
    frontendOrigin: parsedEnvironment.FRONTEND_ORIGIN,
    dataPath: parsedEnvironment.SMART_DB_DATA_PATH ?? resolve(repoRoot, "data", "smart.db"),
    partDb: {
      baseUrl: parsedEnvironment.PARTDB_BASE_URL,
      publicBaseUrl: parsedEnvironment.PARTDB_PUBLIC_BASE_URL,
    },
  };
}

export const config = parseConfig({
  PORT: process.env.PORT,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  SMART_DB_DATA_PATH: process.env.SMART_DB_DATA_PATH,
  PARTDB_BASE_URL: process.env.PARTDB_BASE_URL,
  PARTDB_PUBLIC_BASE_URL: process.env.PARTDB_PUBLIC_BASE_URL,
});
