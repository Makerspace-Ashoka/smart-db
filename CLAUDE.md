# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                  # install all dependencies
pnpm dev                      # run frontend (5173) + middleware (4000) in parallel
pnpm build                    # TypeScript build all packages/apps
pnpm typecheck                # tsc --noEmit across all packages/apps
pnpm test                     # vitest run (all tests)
pnpm coverage                 # vitest with 100% coverage enforcement (text + lcov)
vitest run path/to/file.test.ts  # run a single test file
```

## Architecture

Smart DB is an intake-first inventory system for lab/makerspace workflows. It's a pnpm monorepo with three packages:

- **`packages/contracts`** — Shared Zod schemas, typed error classes, and parse utilities. Both apps import from `@smart-db/contracts` (path-aliased in tsconfig.base.json and vitest.config.ts).
- **`apps/middleware`** — Fastify 5 API server with SQLite persistence (Node.js native `node:sqlite`, WAL mode). Runs on port 4000.
- **`apps/frontend`** — React 19 + Vite phone-first UI. Runs on port 5173.

### Domain model

Seven core entities defined as Zod schemas in `packages/contracts/src/schemas.ts`:

- **PartType** — Canonical part record; can be provisional (`needs_review`) until admin merges it.
- **PhysicalInstance** — Discrete labeled item (QR-linked). Statuses: available, checked_out, consumed, damaged, lost.
- **BulkStock** — Labeled bin for non-countable stock (QR-linked). Levels: full, good, low, empty.
- **QRCode** — Pre-registered sticker identity. Statuses: printed, assigned, voided, duplicate.
- **QrBatch** — Range of pre-registered QR codes.
- **StockEvent** — Append-only audit log (counts are derived from state, never hand-maintained).
- **AuthSession** — Bearer token tied to Part-DB user identity.

### Middleware layers

Request flow: Fastify → CORS → auth pre-handler (validates Part-DB token) → route handler → InventoryService → SQLite.

- `server.ts` — App assembly, error handler mapping `ApplicationError` subclasses to JSON responses.
- `services/inventory-service.ts` — Domain logic (~600 LOC), prepared SQL statements, explicit transactions for assignments and merges.
- `db/migrations.ts` — Schema v1 with 8 tables.
- `partdb/partdb-client.ts` — Part-DB API adapter for token validation and resource discovery.

### Error handling

`packages/contracts/src/errors.ts` defines an `ApplicationError` hierarchy (ParseInput→400, NotFound→404, Unauthenticated→401, Conflict→409, Integration→502, Invariant→500). The middleware error handler catches all errors and normalizes to `{ error: { code, message, details } }`.

### Frontend

Single-page app in `App.tsx` with hot paths: scan → label/assign → event recording. API client in `api.ts` validates all responses with Zod. Auth is token-based (Part-DB token, stored in localStorage).

## Key Conventions

- **Parser-first boundaries**: All inputs validated with Zod (`parseWithSchema()`) before business logic runs.
- **100% test coverage**: Enforced by vitest config. Coverage excludes `App.tsx`, `auth/types.ts`, and `vite-env.d.ts`.
- **Frontend tests run in jsdom**: Matched by `environmentMatchGlobs` in vitest.config.ts — only `apps/frontend/**/*.test.ts?(x)` gets jsdom; everything else runs in Node.
- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled.
- **Atomic operations**: QR assignment + labeled event creation are wrapped in explicit SQL transactions.
- **Append-only events**: State changes produce StockEvent records; counts are derived, not stored.
