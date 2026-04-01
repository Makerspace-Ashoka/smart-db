import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  type DashboardSummary,
  type InventoryEntitySummary,
  type PartDbConnectionStatus,
  type PartType,
  type QRCode,
  type ScanResponse,
  type StockEvent,
} from "@smart-db/contracts";
import { buildServer } from "./server";

const partType: PartType = {
  id: "part-1",
  canonicalName: "Arduino Uno R3",
  category: "Microcontrollers",
  aliases: ["uno r3"],
  imageUrl: null,
  notes: null,
  countable: true,
  needsReview: true,
  partDbPartId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const dashboard: DashboardSummary = {
  partTypeCount: 1,
  instanceCount: 1,
  bulkStockCount: 0,
  provisionalCount: 1,
  unassignedQrCount: 4,
  recentEvents: [],
};

const scanResponse: ScanResponse = {
  mode: "unknown",
  code: "EAN-1234",
  partDb: {
    configured: false,
    connected: false,
    message: "Part-DB credentials are not configured.",
  },
};

const entitySummary: InventoryEntitySummary = {
  id: "instance-1",
  targetType: "instance",
  qrCode: "QR-1001",
  partType,
  location: "Shelf A",
  state: "available",
  assignee: null,
};

const stockEvent: StockEvent = {
  id: "event-1",
  targetType: "instance",
  targetId: "instance-1",
  event: "moved",
  fromState: "available",
  toState: "available",
  location: "Shelf B",
  actor: "lab-admin",
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const partDbStatus: PartDbConnectionStatus = {
  configured: false,
  connected: false,
  baseUrl: null,
  tokenLabel: null,
  userLabel: null,
  message: "Part-DB credentials are not configured.",
  discoveredResources: {
    tokenInfoPath: "/api/tokens/current",
    openApiPath: "/api/docs.json",
    partsPath: null,
    partLotsPath: null,
    storageLocationsPath: null,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

function stubPartDbAuthFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | RequestInfo) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.endsWith("/api/tokens/current")) {
        return {
          ok: true,
          json: async () => ({
            name: "labeler token",
            owner: {
              username: "labeler",
            },
          }),
        };
      }

      if (url.endsWith("/api/docs.json")) {
        return {
          ok: true,
          json: async () => ({
            paths: {
              "/api/parts": {},
              "/api/part_lots": {},
              "/api/storage_locations": {},
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

function makeConfig() {
  return {
    port: 4100,
    frontendOrigin: "http://localhost:5173",
    dataPath: join(mkdtempSync(join(tmpdir(), "smart-db-server-")), "smart.db"),
    partDb: {
      baseUrl: "https://partdb.example.com",
    },
  };
}

describe("buildServer", () => {
  it("supports auth login, session inspection, logout, and 401s", async () => {
    stubPartDbAuthFetch();
    const app = await buildServer({
      configOverride: makeConfig(),
    });

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        apiToken: "token",
      },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      session: {
        username: "labeler",
        expiresAt: null,
      },
    });

    const missingAuth = await app.inject({
      method: "GET",
      url: "/api/auth/session",
    });
    expect(missingAuth.statusCode).toBe(401);

    const session = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: {
        authorization: "Bearer token",
      },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      username: "labeler",
    });

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: {
        authorization: "Bearer token",
      },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.json()).toEqual({ ok: true });

    await app.close();
  });

  it("can build a real server with its own inventory service", async () => {
    const app = await buildServer({
      configOverride: makeConfig(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("can fall back to the module config when no override is provided", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("supports non-test logger configuration paths", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const app = await buildServer({
      configOverride: makeConfig(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    await app.close();
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("serves the route surface and delegates to the inventory service", async () => {
    stubPartDbAuthFetch();
    const voidedQr: QRCode = {
      code: "QR-1001",
      batchId: "batch-1",
      status: "voided",
      assignedKind: null,
      assignedId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const service = {
      getDashboardSummary: vi.fn(() => dashboard),
      searchPartTypes: vi.fn(() => [partType]),
      getProvisionalPartTypes: vi.fn(() => [partType]),
      registerQrBatch: vi.fn(() => ({
        batch: {
          id: "batch-1",
          prefix: "QR",
          startNumber: 1001,
          endNumber: 1002,
          actor: "lab-admin",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        created: 2,
        skipped: 0,
      })),
      scanCode: vi.fn(async () => scanResponse),
      assignQr: vi.fn(() => entitySummary),
      recordEvent: vi.fn(() => stockEvent),
      mergePartTypes: vi.fn(() => partType),
      getPartDbStatus: vi.fn(async () => partDbStatus),
      voidQrCode: vi.fn(() => voidedQr),
      approvePartType: vi.fn(() => ({ ...partType, needsReview: false })),
    };

    const app = await buildServer({
      configOverride: makeConfig(),
      inventoryService: service as never,
    });

    await expect(app.inject({ method: "GET", url: "/health" })).resolves.toMatchObject({
      statusCode: 200,
      json: expect.any(Function),
    });
    await expect(app.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: {
        authorization: "Bearer token",
      },
    })).resolves.toMatchObject({
      statusCode: 200,
    });
    await expect(
      app.inject({
        method: "GET",
        url: "/api/part-types/search?q=arduino",
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "GET",
        url: "/api/part-types/provisional",
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/qr-batches",
        payload: {
          startNumber: 1001,
          count: 2,
        },
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/scan",
        payload: { code: "EAN-1234" },
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/assignments",
        payload: {
          qrCode: "QR-1001",
          entityKind: "instance",
          location: "Shelf A",
          partType: {
            kind: "existing",
            existingPartTypeId: "part-1",
          },
        },
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/events",
        payload: {
          targetType: "instance",
          targetId: "instance-1",
          event: "moved",
        },
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/part-types/merge",
        payload: {
          sourcePartTypeId: "source",
          destinationPartTypeId: "destination",
        },
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "GET",
        url: "/api/partdb/status",
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({
      statusCode: 200,
    });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/qr-codes/QR-1001/void",
        payload: {},
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      app.inject({
        method: "POST",
        url: "/api/part-types/part-1/approve",
        headers: {
          authorization: "Bearer token",
        },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });

    expect(service.searchPartTypes).toHaveBeenCalledWith("arduino");
    expect(service.voidQrCode).toHaveBeenCalledWith("QR-1001", "labeler");
    expect(service.approvePartType).toHaveBeenCalledWith("part-1");
    await app.close();
  });

  it("maps parse failures and domain failures to structured HTTP errors", async () => {
    stubPartDbAuthFetch();
    const service = {
      getDashboardSummary: vi.fn(() => {
        throw new Error("boom");
      }),
      searchPartTypes: vi.fn(() => []),
      getProvisionalPartTypes: vi.fn(() => []),
      registerQrBatch: vi.fn(() => {
        throw new ConflictError("Batch already exists.");
      }),
      scanCode: vi.fn(async () => scanResponse),
      assignQr: vi.fn(() => entitySummary),
      recordEvent: vi.fn(() => stockEvent),
      mergePartTypes: vi.fn(() => partType),
      getPartDbStatus: vi.fn(async () => partDbStatus),
    };

    const app = await buildServer({
      configOverride: makeConfig(),
      inventoryService: service as never,
    });

    const parseFailure = await app.inject({
      method: "POST",
      url: "/api/qr-batches",
      payload: {
        startNumber: 1001,
        count: 0,
      },
      headers: {
        authorization: "Bearer token",
      },
    });
    expect(parseFailure.statusCode).toBe(400);
    expect(parseFailure.json()).toEqual({
      error: {
        code: "parse_input",
        message: "Could not parse register QR batch request.",
        details: expect.objectContaining({
          context: "register QR batch request",
        }),
      },
    });

    const domainFailure = await app.inject({
      method: "POST",
      url: "/api/qr-batches",
      payload: {
        startNumber: 1001,
        count: 2,
      },
      headers: {
        authorization: "Bearer token",
      },
    });
    expect(domainFailure.statusCode).toBe(409);
    expect(domainFailure.json()).toEqual({
      error: {
        code: "conflict",
        message: "Batch already exists.",
        details: {},
      },
    });

    const invariantFailure = await app.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: {
        authorization: "Bearer token",
      },
    });
    expect(invariantFailure.statusCode).toBe(500);
    expect(invariantFailure.json()).toEqual({
      error: {
        code: "invariant",
        message: "Unhandled middleware failure.",
        details: {},
      },
    });

    await app.close();
  });
});
