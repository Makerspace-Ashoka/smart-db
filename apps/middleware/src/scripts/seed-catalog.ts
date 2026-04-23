import { config } from "../config.js";
import { createDatabase } from "../db/database.js";
import { PartDbOutbox } from "../outbox/partdb-outbox.js";
import { PartDbOutboxWorker } from "../outbox/partdb-worker.js";
import { PartDbClient } from "../partdb/partdb-client.js";
import { CategoryResolver } from "../partdb/category-resolver.js";
import { PartDbOperations } from "../partdb/partdb-operations.js";
import { PartDbRestClient } from "../partdb/partdb-rest.js";
import { PartDbCategoriesResource } from "../partdb/resources/categories.js";
import { PartDbMeasurementUnitsResource } from "../partdb/resources/measurement-units.js";
import { PartDbPartLotsResource } from "../partdb/resources/part-lots.js";
import { PartDbPartsResource } from "../partdb/resources/parts.js";
import { PartDbStorageLocationsResource } from "../partdb/resources/storage-locations.js";
import { InventoryService } from "../services/inventory-service.js";
import { defaultMeasurementUnit, type NewPartTypeDraft } from "@smart-db/contracts";
import { buildPartTypeArtUrl } from "./part-type-art.js";
import { ROBU_SEED_CATALOG } from "./seed-data.js";

async function main(): Promise<void> {
  const db = createDatabase(config.dataPath);
  const syncEnabled =
    config.partDb.syncEnabled &&
    Boolean(config.partDb.baseUrl) &&
    Boolean(config.partDb.apiToken);
  const outbox = syncEnabled ? new PartDbOutbox(db) : null;
  const service = new InventoryService(db, new PartDbClient(config.partDb), outbox);

  let created = 0;
  let skipped = 0;

  for (const item of ROBU_SEED_CATALOG) {
    const draft: NewPartTypeDraft = {
      kind: "new",
      canonicalName: item.name,
      category: item.category,
      aliases: [item.sku],
      notes: `Robu.in SKU ${item.sku}`,
      imageUrl: buildPartTypeArtUrl(item.category, item.name),
      countable: item.countable,
      unit: item.unit ?? defaultMeasurementUnit,
    };

    try {
      // Use private resolvePartType + ensurePartTypeSync via casting.
      // This creates the part type catalog entry without an inventory entity.
      const correlationId = (globalThis.crypto ?? require("node:crypto") as { randomUUID: () => string }).randomUUID();
      const partType = (service as unknown as {
        resolvePartType: (d: NewPartTypeDraft) => { id: string; canonicalName: string };
      }).resolvePartType(draft);
      (service as unknown as {
        ensurePartTypeSync: (pt: unknown, c: string) => string | null;
      }).ensurePartTypeSync(partType, correlationId);
      console.log(`✓ ${item.sku}  ${item.name}  →  ${item.category}`);
      created += 1;
    } catch (error) {
      console.error(`✗ ${item.sku}  ${item.name}`, (error as Error).message);
      skipped += 1;
    }
  }

  console.log(`\nSeed complete. Created ${created}, skipped ${skipped}.`);

  if (!syncEnabled || !outbox) {
    console.log("Part-DB sync disabled; nothing more to drain.");
    db.close?.();
    return;
  }

  // Drain the outbox synchronously by ticking the worker repeatedly.
  const rest = new PartDbRestClient({
    baseUrl: config.partDb.baseUrl!,
    apiToken: config.partDb.apiToken!,
  });
  const worker = new PartDbOutboxWorker(
    outbox,
    new PartDbOperations(
      new CategoryResolver(db, new PartDbCategoriesResource(rest)),
      new PartDbMeasurementUnitsResource(rest),
      new PartDbPartsResource(rest),
      new PartDbPartLotsResource(rest),
      new PartDbStorageLocationsResource(rest),
    ),
    console,
    { intervalMs: 0 },
  );

  let totalDelivered = 0;
  let totalFailed = 0;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const tick = await worker.tick();
    totalDelivered += tick.delivered;
    totalFailed += tick.failed;
    if (tick.claimed === 0) break;
  }
  console.log(`Part-DB sync drained: delivered ${totalDelivered}, failed ${totalFailed}.`);

  db.close?.();
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
