# Delivery Plan

## Phase 1: Intake Core

- Keep the backlog workflow primary
- Pre-register QR batches
- Assign QRs to either `PhysicalInstance` or `BulkStock`
- Support existing part-type reuse and provisional creation
- Track actor, location, and first event at assignment time

Success condition:
The lab can label backlog items from a phone without opening the Part-DB UI.

## Phase 2: Lifecycle Discipline

- Treat every later scan as an interaction, not just a lookup
- Record movement, checkout, return, consumption, and bulk level changes
- Keep counts derived from instance state

Success condition:
The database remains useful after initial intake because there is a cheap path for updates.

## Phase 3: Naming Hygiene

- Keep provisional part types visible
- Add admin merge and confirmation flows
- Preserve aliases whenever a merge happens

Success condition:
Parallel labelers do not poison the catalog with permanent duplicates.

## Phase 4: Part-DB Sync

- Confirm the exact target Part-DB resource paths from the live instance
- Map `PartType` to Part-DB parts
- Map storage location strings to Part-DB storage locations
- Decide how aggregate counts are pushed back for `PhysicalInstance`
- Add idempotent sync jobs and reconciliation reporting

Success condition:
Smart DB becomes the operational front door while Part-DB remains synchronized enough for broader inventory reporting.

## Immediate Next Steps

1. Boot the repo locally and verify the frontend and middleware run together.
2. Point the middleware at a real Part-DB instance and inspect discovered resources.
3. Decide the authoritative location taxonomy for the lab.
4. Add barcode lookup rules once a live Part-DB instance is available.
5. Add auth only after the intake flow has been proven with real operators.
