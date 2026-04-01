import type { z } from "zod";
import {
  applicationErrorResponseSchema,
  assignQrRequestSchema,
  authSessionSchema,
  dashboardSummarySchema,
  inventoryEntitySummarySchema,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  mergePartTypesRequestSchema,
  parseWithSchema,
  partDbConnectionStatusSchema,
  partTypeSchema,
  qrCodeSchema,
  recordEventRequestSchema,
  registerQrBatchRequestSchema,
  registerQrBatchResponseSchema,
  scanResponseSchema,
  stockEventSchema,
  type AssignQrRequest,
  type AuthSession,
  type DashboardSummary,
  type LoginRequest,
  type LoginResponse,
  type LogoutResponse,
  type MergePartTypesRequest,
  type PartDbConnectionStatus,
  type PartType,
  type RecordEventRequest,
  type RegisterQrBatchRequest,
  type RegisterQrBatchResponse,
  type ScanResponse,
  type StockEvent,
} from "@smart-db/contracts";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const sessionTokenStorageKey = "smart-db.partdb-api-token";

let sessionToken: string | null = null;

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

interface ApiRequestInit extends RequestInit {
  signal?: AbortSignal;
  tokenOverride?: string | null;
}

function currentSessionToken(): string | null {
  if (sessionToken) {
    return sessionToken;
  }

  if (typeof window === "undefined") {
    return null;
  }

  sessionToken = window.localStorage.getItem(sessionTokenStorageKey);
  return sessionToken;
}

async function request<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  path: string,
  init?: ApiRequestInit,
): Promise<z.output<TSchema>> {
  const activeToken = init?.tokenOverride ?? currentSessionToken();
  const timeoutSignal = AbortSignal.timeout(15_000);
  const combinedSignal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
    signal: combinedSignal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const parsedError =
      body === null
        ? null
        : applicationErrorResponseSchema.safeParse(body);
    if (parsedError?.success) {
      throw new ApiClientError(
        parsedError.data.error.code,
        parsedError.data.error.message,
        parsedError.data.error.details,
      );
    }

    throw new ApiClientError("transport", `Request failed with ${response.status}`);
  }

  return parseWithSchema(schema, await response.json(), `response for ${path}`);
}

export function setSessionToken(token: string): void {
  sessionToken = token;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(sessionTokenStorageKey, token);
  }
}

export function clearSessionToken(): void {
  sessionToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(sessionTokenStorageKey);
  }
}

export function hydrateSessionToken(): string | null {
  sessionToken =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(sessionTokenStorageKey);
  return sessionToken;
}

function idempotencyHeaders(): Record<string, string> {
  return { "X-Idempotency-Key": crypto.randomUUID() };
}

export const api = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const parsedPayload = parseWithSchema(loginRequestSchema, payload, "login form");
    const response = await request(loginResponseSchema, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsedPayload),
      tokenOverride: parsedPayload.apiToken,
    });
    setSessionToken(parsedPayload.apiToken);
    return response;
  },
  getSession(signal?: AbortSignal): Promise<AuthSession> {
    return request(authSessionSchema, "/api/auth/session", signal ? { signal } : undefined);
  },
  async logout(): Promise<LogoutResponse> {
    const response = await request(logoutResponseSchema, "/api/auth/logout", {
      method: "POST",
    });
    clearSessionToken();
    return response;
  },
  getDashboard(): Promise<DashboardSummary> {
    return request(dashboardSummarySchema, "/api/dashboard");
  },
  getPartDbStatus(): Promise<PartDbConnectionStatus> {
    return request(partDbConnectionStatusSchema, "/api/partdb/status");
  },
  getProvisionalPartTypes(): Promise<PartType[]> {
    return request(partTypeSchema.array(), "/api/part-types/provisional");
  },
  searchPartTypes(query: string, signal?: AbortSignal): Promise<PartType[]> {
    return request(
      partTypeSchema.array(),
      `/api/part-types/search?q=${encodeURIComponent(query)}`,
      signal ? { signal } : undefined,
    );
  },
  registerQrBatch(payload: RegisterQrBatchRequest): Promise<RegisterQrBatchResponse> {
    return request(registerQrBatchResponseSchema, "/api/qr-batches", {
      method: "POST",
      body: JSON.stringify(parseWithSchema(registerQrBatchRequestSchema, payload, "QR batch form")),
      headers: idempotencyHeaders(),
    });
  },
  scan(code: string, signal?: AbortSignal): Promise<ScanResponse> {
    return request(
      scanResponseSchema,
      "/api/scan",
      signal
        ? {
            method: "POST",
            body: JSON.stringify({ code }),
            signal,
          }
        : {
            method: "POST",
            body: JSON.stringify({ code }),
          },
    );
  },
  assignQr(payload: AssignQrRequest) {
    return request(inventoryEntitySummarySchema, "/api/assignments", {
      method: "POST",
      body: JSON.stringify(parseWithSchema(assignQrRequestSchema, payload, "assignment form")),
      headers: idempotencyHeaders(),
    });
  },
  recordEvent(payload: RecordEventRequest): Promise<StockEvent> {
    return request(stockEventSchema, "/api/events", {
      method: "POST",
      body: JSON.stringify(parseWithSchema(recordEventRequestSchema, payload, "event form")),
      headers: idempotencyHeaders(),
    });
  },
  mergePartTypes(payload: MergePartTypesRequest): Promise<PartType> {
    return request(partTypeSchema, "/api/part-types/merge", {
      method: "POST",
      body: JSON.stringify(parseWithSchema(mergePartTypesRequestSchema, payload, "merge request")),
      headers: idempotencyHeaders(),
    });
  },
  voidQr(code: string) {
    return request(qrCodeSchema, `/api/qr-codes/${encodeURIComponent(code)}/void`, {
      method: "POST",
      body: JSON.stringify({}),
      headers: idempotencyHeaders(),
    });
  },
  approvePartType(id: string): Promise<PartType> {
    return request(partTypeSchema, `/api/part-types/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
      headers: idempotencyHeaders(),
    });
  },
};
