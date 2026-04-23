import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { createDatabase } from "../db/database.js";
import {
  FDM_FILAMENT_SEED_CATALOG,
  ROBU_SEED_CATALOG,
  SLA_RESIN_SEED_CATALOG,
} from "./seed-data.js";
import { buildPartTypeArtStem } from "./part-type-art.js";

interface ArtItem {
  readonly name: string;
  readonly category: string;
}

interface BatchPlan {
  readonly id: string;
  readonly category: string;
  readonly rows: number;
  readonly cols: number;
  readonly items: readonly {
    readonly canonicalName: string;
    readonly category: string;
    readonly outputFilename: string;
  }[];
  readonly prompt: string;
}

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const outPath = resolve(repoRoot, "tmp", "imagegen", "orthographic-batches.json");
const compactPreset = process.argv.includes("--preset") && process.argv[process.argv.indexOf("--preset") + 1] === "compact";

function collectItems(): ArtItem[] {
  const seen = new Map<string, ArtItem>();
  for (const item of ROBU_SEED_CATALOG) {
    seen.set(`${item.category}:::${item.name}`.toLowerCase(), { name: item.name, category: item.category });
  }
  for (const item of FDM_FILAMENT_SEED_CATALOG) {
    seen.set(`${item.category}:::${item.name}`.toLowerCase(), { name: item.name, category: item.category });
  }
  for (const item of SLA_RESIN_SEED_CATALOG) {
    seen.set(`${item.category}:::${item.name}`.toLowerCase(), { name: item.name, category: item.category });
  }
  if (existsSync(config.dataPath)) {
    const db = createDatabase(config.dataPath);
    try {
      const rows = db.prepare(
        `SELECT canonical_name, category, category_path_json FROM part_types ORDER BY canonical_name`,
      ).all() as Array<{ canonical_name: string; category: string; category_path_json: string }>;
      for (const row of rows) {
        const category = parseCategoryPath(row.category_path_json, row.category);
        const key = `${category}:::${row.canonical_name}`.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, { name: row.canonical_name, category });
        }
      }
    } finally {
      db.close?.();
    }
  }
  return [...seen.values()].sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
}

function parseCategoryPath(rawJson: string, fallback: string): string {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string" && value.trim().length > 0)) {
      return parsed.join("/");
    }
  } catch {
    // ignore and fall back
  }
  return fallback;
}

function groupItems(items: readonly ArtItem[]): Map<string, ArtItem[]> {
  const groups = new Map<string, ArtItem[]>();
  for (const item of items) {
    const key = compactPreset ? compactFamilyKey(item) : item.category;
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return groups;
}

function gridForCount(count: number): { rows: number; cols: number; batchSize: number } {
  if (count <= 1) return { rows: 1, cols: 1, batchSize: 1 };
  if (count <= 2) return { rows: 1, cols: 2, batchSize: 2 };
  if (count <= 3) return { rows: 1, cols: 3, batchSize: 3 };
  if (count <= 4) return { rows: 2, cols: 2, batchSize: 4 };
  return { rows: 2, cols: 3, batchSize: 6 };
}

function compactFamilyKey(item: ArtItem): string {
  const category = item.category;
  const name = item.name.toLowerCase();
  if (category.startsWith("Compute/") || category.startsWith("Cameras/")) return "Boards And Cameras";
  if (category.startsWith("Motors/")) return "Motors";
  if (category.startsWith("Motor Control/")) return "Motor Control";
  if (category.startsWith("Sensors/") || category.startsWith("Power/")) return "Sensors And Power";
  if (category.startsWith("Actuators/") || category.startsWith("Mechanical/") || category.startsWith("Fasteners")) return "Actuation And Hardware";
  if (category === "Materials/3D Printing Filament/PLA" && name.includes("pla+")) return "PLA Plus Filament";
  if (category === "Materials/3D Printing Filament/PLA") return "Specialty PLA Filament";
  if (category === "Materials/3D Printing Filament/ABS") return "ABS Filament";
  if (
    category === "Materials/3D Printing Filament/PETG"
    || category === "Materials/3D Printing Filament/TPU"
    || category === "Materials/3D Printing Filament/Nylon CF"
  ) return "PETG TPU And Nylon Filament";
  if (category.startsWith("Materials/SLA Resin/")) return "SLA Resin";
  return category;
}

function compactGrid(key: string, count: number): { rows: number; cols: number; batchSize: number } {
  if (key === "Boards And Cameras") {
    if (count <= 4) return { rows: 2, cols: 2, batchSize: 4 };
    return { rows: 2, cols: 4, batchSize: 8 };
  }
  if (key === "Motors") {
    if (count <= 5) return { rows: 1, cols: 5, batchSize: 5 };
    return { rows: 2, cols: 5, batchSize: 10 };
  }
  if (key === "Motor Control") return { rows: 3, cols: 3, batchSize: 9 };
  if (key === "Sensors And Power") return { rows: 2, cols: 5, batchSize: 10 };
  if (key === "Actuation And Hardware") return { rows: 3, cols: 3, batchSize: 9 };
  if (key === "PLA Plus Filament" || key === "Specialty PLA Filament") return { rows: 2, cols: 5, batchSize: 10 };
  if (key === "ABS Filament" || key === "PETG TPU And Nylon Filament") return { rows: 3, cols: 4, batchSize: 12 };
  if (key === "SLA Resin") return { rows: 3, cols: 5, batchSize: 15 };
  return gridForCount(count);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function buildPrompt(rows: number, cols: number, items: readonly ArtItem[]): string {
  const cells = Array.from({ length: rows * cols }, (_, index) => {
    const item = items[index];
    const row = Math.floor(index / cols) + 1;
    const col = (index % cols) + 1;
    if (!item) {
      return `Row ${row} column ${col}: leave empty cream cell with no object.`;
    }
    return `Row ${row} column ${col}: ${item.name}, category ${item.category}.`;
  }).join("\n");

  return [
    `Create a perfectly aligned orthographic catalog sheet with ${rows} rows and ${cols} columns on a warm cream background (#f6f1e7).`,
    "Use thin pale divider lines to define the grid.",
    "Every occupied cell contains exactly one item, centered, fully visible, orthographic, no perspective distortion, no text, no watermark, no shadows crossing cell boundaries.",
    "Keep the rendering style consistent across all cells: precise product catalog art, clean background, restrained realistic materials.",
    "Use row-major placement exactly as specified.",
    cells,
  ].join("\n");
}

function buildPlans(items: readonly ArtItem[]): BatchPlan[] {
  const groups = groupItems(items);
  const plans: BatchPlan[] = [];
  for (const [category, categoryItems] of [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const { rows, cols, batchSize } = compactPreset ? compactGrid(category, categoryItems.length) : gridForCount(categoryItems.length);
    for (const [batchIndex, batchItems] of chunk(categoryItems, batchSize).entries()) {
      const effectiveGrid = compactPreset ? compactGrid(category, batchItems.length) : gridForCount(batchItems.length);
      const id = `${slugify(category)}-${String(batchIndex + 1).padStart(2, "0")}`;
      plans.push({
        id,
        category,
        rows: effectiveGrid.rows,
        cols: effectiveGrid.cols,
        items: batchItems.map((item) => ({
          canonicalName: item.name,
          category: item.category,
          outputFilename: `${buildPartTypeArtStem(item.category, item.name)}.webp`,
        })),
        prompt: buildPrompt(effectiveGrid.rows, effectiveGrid.cols, batchItems),
      });
    }
  }
  return plans;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

async function main(): Promise<void> {
  mkdirSync(resolve(repoRoot, "tmp", "imagegen"), { recursive: true });
  const plans = buildPlans(collectItems());
  writeFileSync(outPath, `${JSON.stringify(plans, null, 2)}\n`, "utf8");
  console.log(`Wrote ${plans.length} batch plans to ${outPath}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
