import { config } from "../config.js";
import { createDatabase } from "../db/database.js";
import { PartDbOutbox } from "../outbox/partdb-outbox.js";
import { PartDbClient } from "../partdb/partdb-client.js";
import { InventoryService } from "../services/inventory-service.js";

async function main(): Promise<void> {
  if (!config.partDb.syncEnabled || !config.partDb.baseUrl || !config.partDb.apiToken) {
    throw new Error(
      "Part-DB sync is not enabled. Set PARTDB_SYNC_ENABLED=true with PARTDB_BASE_URL and PARTDB_API_TOKEN before running backfill.",
    );
  }

  const db = createDatabase(config.dataPath);
  try {
    const service = new InventoryService(
      db,
      new PartDbClient(config.partDb),
      new PartDbOutbox(db),
    );
    const result = service.backfillPartDbSync();

    console.log(
      [
        "Part-DB backfill queued.",
        `Part types: ${result.queuedPartTypes}`,
        `Lots: ${result.queuedLots}`,
        `Skipped: ${result.skipped}`,
      ].join(" "),
    );
  } finally {
    db.close?.();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
