import { authMachine } from "./auth-machine";
import { scanSessionMachine } from "./scan-session-machine";

export const implementedRewriteMachines = {
  auth: authMachine,
  scanSession: scanSessionMachine,
} as const;

