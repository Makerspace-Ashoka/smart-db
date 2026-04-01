# Smart DB

Smart DB is an intake-first inventory system for lab and makerspace workflows. It separates the fast phone-first labeling experience from the inventory middleware that owns QR batches, event history, and Part-DB integration seams.

## Repo Layout

- `apps/frontend`: phone-friendly React app for scan, assign, and lifecycle actions
- `apps/middleware`: Fastify API with SQLite persistence and Part-DB connection discovery
- `packages/contracts`: shared TypeScript contracts between frontend and middleware
- `docs`: architecture and delivery plan

## Principles

- Intake remains fast, but the data model distinguishes `PartType`, `PhysicalInstance`, and `BulkStock`.
- QR codes are pre-registered and lifecycle-safe.
- Counts are derived from state, not hand-maintained.
- Part-DB is treated as an external system of record for catalog and stock sync, not as UI glue.

## Quick Start

```bash
pnpm install
cp apps/middleware/.env.example apps/middleware/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm dev
```

The middleware defaults to `http://localhost:4000` and creates `data/smart.db` on first boot.

## Current Scope

The first vertical slice covers:

- QR batch registration
- scan -> label -> assign flow
- stock event logging for existing QRs
- provisional part types and part-type merge
- Part-DB connection status and resource discovery

The sync path into Part-DB is designed and isolated behind middleware services, but the repo intentionally stops short of speculative write calls against undocumented upstream payloads.

