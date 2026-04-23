import { config } from "../config.js";
import { createDatabase } from "../db/database.js";
import { buildPartTypeArtUrl } from "./part-type-art.js";

interface PartTypeRow {
  readonly id: string;
  readonly canonical_name: string;
  readonly category: string;
  readonly category_path_json: string;
  readonly image_url: string | null;
}

function resolveCategoryPath(row: PartTypeRow): string {
  try {
    const parsed = JSON.parse(row.category_path_json) as unknown;
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string" && value.trim().length > 0)) {
      return parsed.join("/");
    }
  } catch {
    // fall through to the legacy category column
  }
  return row.category;
}

async function main(): Promise<void> {
  const db = createDatabase(config.dataPath);
  const rows = db
    .prepare(`SELECT id, canonical_name, category, category_path_json, image_url FROM part_types ORDER BY canonical_name`)
    .all() as unknown as PartTypeRow[];

  let updated = 0;
  let unchanged = 0;
  const now = new Date().toISOString();
  const statement = db.prepare(`UPDATE part_types SET image_url = ?, updated_at = ? WHERE id = ?`);

  for (const row of rows) {
    const categoryPath = resolveCategoryPath(row);
    const imageUrl = buildPartTypeArtUrl(categoryPath, row.canonical_name);
    if (row.image_url === imageUrl) {
      unchanged += 1;
      continue;
    }
    statement.run(imageUrl, now, row.id);
    updated += 1;
    console.log(`✓ ${row.canonical_name} -> ${imageUrl}`);
  }

  db.close?.();
  console.log(`Backfill complete. Updated ${updated}, unchanged ${unchanged}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
