import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { createDatabase } from "../db/database.js";
import { FDM_FILAMENT_SEED_CATALOG, ROBU_SEED_CATALOG, SLA_RESIN_SEED_CATALOG } from "./seed-data.js";
import { buildPartTypeArtStem, describePartTypeArtPrompt } from "./part-type-art.js";

interface SeedItem {
  readonly name: string;
  readonly category: string;
}

interface PlannedJob extends SeedItem {
  readonly stem: string;
  readonly remotePath: string;
  readonly svgPath: string;
  readonly pngPath: string;
  readonly croppedPngPath: string;
  readonly finalPath: string;
}

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const tmpRoot = resolve(repoRoot, "tmp", "imagegen");
const remoteDir = resolve(tmpRoot, "part-type-art-raw");
const svgDir = resolve(tmpRoot, "part-type-art-svg");
const pngDir = resolve(tmpRoot, "part-type-art-png");
const batchPath = resolve(tmpRoot, "part-type-art.jsonl");
const finalDir = resolve(repoRoot, "apps", "frontend", "public", "art", "part-types");
const imageGenPath = process.env.IMAGE_GEN?.trim()
  || resolve(process.env.HOME ?? "", ".codex", "skills", "imagegen", "scripts", "image_gen.py");

function parseLimit(): number | null {
  const limitIndex = process.argv.findIndex((argument) => argument === "--limit");
  if (limitIndex === -1) {
    return null;
  }
  const rawValue = process.argv[limitIndex + 1];
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("`--limit` must be followed by a positive integer.");
  }
  return parsed;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function ensureWorkingDirs(): void {
  mkdirSync(tmpRoot, { recursive: true });
  mkdirSync(remoteDir, { recursive: true });
  mkdirSync(svgDir, { recursive: true });
  mkdirSync(pngDir, { recursive: true });
  mkdirSync(finalDir, { recursive: true });
}

function collectSeedItems(): SeedItem[] {
  const seen = new Map<string, SeedItem>();
  const catalogs: readonly SeedItem[] = [
    ...ROBU_SEED_CATALOG,
    ...FDM_FILAMENT_SEED_CATALOG,
    ...SLA_RESIN_SEED_CATALOG,
    ...collectDatabaseItems(),
  ];

  for (const item of catalogs) {
    const key = `${item.category}:::${item.name}`.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { name: item.name, category: item.category });
    }
  }

  return [...seen.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function collectDatabaseItems(): SeedItem[] {
  if (!existsSync(config.dataPath)) {
    return [];
  }

  const db = createDatabase(config.dataPath);
  try {
    const rows = db.prepare(
      `SELECT canonical_name, category, category_path_json FROM part_types ORDER BY canonical_name`,
    ).all() as Array<{
      canonical_name: string;
      category: string;
      category_path_json: string;
    }>;

    return rows.map((row) => ({
      name: row.canonical_name,
      category: parseCategoryPath(row.category_path_json, row.category),
    }));
  } catch {
    return [];
  } finally {
    db.close?.();
  }
}

function parseCategoryPath(rawJson: string, fallback: string): string {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string" && value.trim().length > 0)) {
      return parsed.join("/");
    }
  } catch {
    // fall back to the legacy category field below
  }
  return fallback;
}

function planJobs(force: boolean, limit: number | null): PlannedJob[] {
  const planned = collectSeedItems()
    .map((item) => {
      const stem = buildPartTypeArtStem(item.category, item.name);
      return {
        ...item,
        stem,
        remotePath: resolve(remoteDir, `${stem}.webp`),
        svgPath: resolve(svgDir, `${stem}.svg`),
        pngPath: resolve(pngDir, `${stem}.png`),
        croppedPngPath: resolve(pngDir, `${stem}-crop.png`),
        finalPath: resolve(finalDir, `${stem}.webp`),
      };
    })
    .filter((item) => force || !existsSync(item.finalPath));

  return limit === null ? planned : planned.slice(0, limit);
}

function writeBatchFile(jobs: readonly PlannedJob[]): void {
  ensureWorkingDirs();
  const payload = jobs.map((job) => {
    const spec = describePartTypeArtPrompt(job);
    return JSON.stringify({
      prompt: spec.prompt,
      use_case: "product-mockup",
      scene: spec.scene,
      subject: spec.subject,
      style: spec.style,
      composition: spec.composition,
      lighting: spec.lighting,
      palette: spec.palette,
      materials: spec.materials,
      constraints: spec.constraints,
      negative: spec.negative,
      size: "1536x1024",
      quality: "medium",
      output_format: "webp",
      out: `${job.stem}.webp`,
    });
  }).join("\n");

  writeFileSync(batchPath, `${payload}\n`, "utf8");
}

function generateRemoteAssets(): void {
  execFileSync(
    "uv",
    [
      "run",
      "--with",
      "openai",
      "python",
      imageGenPath,
      "generate-batch",
      "--input",
      batchPath,
      "--out-dir",
      remoteDir,
      "--concurrency",
      "4",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
}

function convertPngToWebp(job: PlannedJob): void {
  execFileSync(
    "cwebp",
    [
      "-quiet",
      "-q",
      "82",
      job.croppedPngPath,
      "-o",
      job.finalPath,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
}

function cropRemoteAsset(job: PlannedJob): void {
  if (!existsSync(job.remotePath)) {
    throw new Error(`Missing generated source image: ${job.remotePath}`);
  }
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      job.remotePath,
      "-vf",
      "crop=1024:1024:(in_w-1024)/2:(in_h-1024)/2,scale=720:720:flags=lanczos",
      job.croppedPngPath,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
  convertPngToWebp(job);
}

function generateLocalAsset(job: PlannedJob): void {
  writeFileSync(job.svgPath, renderLocalArtSvg(job), "utf8");
  execFileSync(
    "sips",
    ["-s", "format", "png", job.svgPath, "--out", job.pngPath],
    {
      cwd: repoRoot,
      stdio: "ignore",
    },
  );
  execFileSync(
    "sips",
    ["-c", "720", "720", job.pngPath, "--out", job.croppedPngPath],
    {
      cwd: repoRoot,
      stdio: "ignore",
    },
  );
  convertPngToWebp(job);
}

function renderLocalArtSvg(job: PlannedJob): string {
  const titleLines = splitTitle(job.name);
  const categoryLines = splitCategory(job.category);
  const palette = paletteForJob(job);
  const iconId = iconIdForJob(job);
  const patternOffset = 60 + (hashString(`${job.name}:${job.category}`) % 200);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="720" viewBox="0 0 900 720">`,
    "<defs>",
    `  <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="${palette.bgTop}"/>`,
    `    <stop offset="100%" stop-color="${palette.bgBottom}"/>`,
    "  </linearGradient>",
    `  <radialGradient id="glow" cx="26%" cy="22%" r="70%">`,
    `    <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.92"/>`,
    `    <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0"/>`,
    "  </radialGradient>",
    "</defs>",
    `  <rect width="900" height="720" fill="url(#bg)"/>`,
    `  <circle cx="${190 + (patternOffset % 140)}" cy="${170 + (patternOffset % 90)}" r="220" fill="url(#glow)"/>`,
    `  <path d="M-40 ${140 + (patternOffset % 50)}H940" stroke="${palette.rule}" stroke-width="1.5" opacity="0.35"/>`,
    `  <path d="M-40 ${510 + (patternOffset % 65)}H940" stroke="${palette.rule}" stroke-width="1.5" opacity="0.26"/>`,
    `  <g transform="translate(118 86)">`,
    `    <rect x="0" y="0" width="664" height="548" rx="38" fill="rgba(255,255,255,0.34)" stroke="${palette.frame}" stroke-width="2"/>`,
    `    <rect x="22" y="22" width="134" height="34" rx="17" fill="${palette.badge}" fill-opacity="0.9"/>`,
    `    <text x="38" y="44" font-family="Menlo, Consolas, monospace" font-size="15" letter-spacing="2.1" fill="${palette.badgeText}">${escapeXml(categoryLines[0] ?? "SMART DB")}</text>`,
    `    <g transform="translate(154 78)">`,
    `      <rect x="0" y="0" width="420" height="282" rx="34" fill="rgba(255,255,255,0.52)" stroke="${palette.card}" stroke-width="1.5"/>`,
    `      <g transform="translate(126 54) scale(7.1)">`,
    `        ${renderIconPaths(iconId, palette.icon)}`,
    "      </g>",
    "    </g>",
    `    <path d="M62 364H602" stroke="${palette.rule}" stroke-width="2" opacity="0.48"/>`,
    `    <text x="62" y="436" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${palette.title}" letter-spacing="-0.4">${escapeXml(titleLines[0] ?? job.name)}</text>`,
    `    ${titleLines[1] ? `<text x="62" y="486" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${palette.title}" letter-spacing="-0.4">${escapeXml(titleLines[1])}</text>` : ""}`,
    `    <text x="62" y="542" font-family="Menlo, Consolas, monospace" font-size="18" letter-spacing="2.2" fill="${palette.meta}">${escapeXml(categoryLines[1] ?? categoryLines[0] ?? "PART TYPE")}</text>`,
    `    <circle cx="590" cy="454" r="46" fill="${palette.badge}" fill-opacity="0.82"/>`,
    `    <path d="M520 454H660" stroke="${palette.rule}" stroke-width="1.2" opacity="0.35"/>`,
    `  </g>`,
    `</svg>`,
  ].join("\n");
}

function splitTitle(title: string): [string, string?] {
  const words = title.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length <= 24 || current.length === 0) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === 1) {
      continue;
    }
    break;
  }

  if (current.length > 0 && lines.length < 2) {
    lines.push(current);
  }

  if (lines.length === 0) {
    return [title];
  }
  if (lines.length === 1) {
    return [lines[0]!];
  }
  return [lines[0]!, lines[1]!];
}

function splitCategory(category: string): [string, string?] {
  const segments = category.split("/").map((segment) => segment.trim()).filter(Boolean);
  const top = segments[0] ?? "SMART DB";
  const leaf = segments.at(-1) ?? top;
  return [top.toUpperCase(), leaf.toUpperCase()];
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function paletteForJob(job: SeedItem): {
  readonly bgTop: string;
  readonly bgBottom: string;
  readonly glow: string;
  readonly frame: string;
  readonly card: string;
  readonly badge: string;
  readonly badgeText: string;
  readonly icon: string;
  readonly title: string;
  readonly meta: string;
  readonly rule: string;
} {
  const category = job.category;
  const name = job.name.toLowerCase();
  const color = colorFromName(name);

  if (category.startsWith("Materials/3D Printing Filament/")) {
    const accent = color ?? "#c47214";
    return {
      bgTop: "#f8f2e8",
      bgBottom: "#efe5d2",
      glow: withOpacity(accent, 0.34),
      frame: "#d3b991",
      card: "#e2cfae",
      badge: accent,
      badgeText: "#fffaf2",
      icon: "#2c3140",
      title: "#1a1f2c",
      meta: "#5c6270",
      rule: "#b08a58",
    };
  }

  if (category.startsWith("Materials/SLA Resin/")) {
    const accent = color ?? "#8a6f55";
    return {
      bgTop: "#f7f1e8",
      bgBottom: "#ebe2d8",
      glow: withOpacity(accent, 0.28),
      frame: "#cfbeb0",
      card: "#decfc3",
      badge: accent,
      badgeText: "#fffaf2",
      icon: "#2d2b34",
      title: "#1c1f28",
      meta: "#605d67",
      rule: "#a9927f",
    };
  }

  if (category.startsWith("Power/")) {
    return {
      bgTop: "#f5efe4",
      bgBottom: "#e8dcc8",
      glow: "rgba(141, 82, 24, 0.32)",
      frame: "#cbb394",
      card: "#dcc8ae",
      badge: "#a16322",
      badgeText: "#fff7ee",
      icon: "#2b2c2f",
      title: "#1b1f2a",
      meta: "#5b5e68",
      rule: "#9c7e5a",
    };
  }

  if (category.startsWith("Motors/") || category.startsWith("Actuators/")) {
    return {
      bgTop: "#f4eee3",
      bgBottom: "#e5dccd",
      glow: "rgba(96, 116, 156, 0.28)",
      frame: "#c5b8a8",
      card: "#d8cec1",
      badge: "#5b739c",
      badgeText: "#f5f8ff",
      icon: "#1e2430",
      title: "#1a1f2c",
      meta: "#5c6270",
      rule: "#8f8f9e",
    };
  }

  return {
    bgTop: "#f6f1e7",
    bgBottom: "#ece3d3",
    glow: "rgba(196, 114, 20, 0.26)",
    frame: "#cbb99d",
    card: "#ddd0bb",
    badge: "#c47214",
    badgeText: "#fff8ef",
    icon: "#202734",
    title: "#1a1f2c",
    meta: "#5c6270",
    rule: "#9e8b73",
  };
}

function colorFromName(name: string): string | null {
  if (name.includes("black")) return "#2a2f38";
  if (name.includes("white") || name.includes("clear") || name.includes("natural")) return "#d9d3c7";
  if (name.includes("grey") || name.includes("gray") || name.includes("silver")) return "#8b9099";
  if (name.includes("red")) return "#b24b3d";
  if (name.includes("green")) return "#5f8a5b";
  if (name.includes("blue")) return "#5678a8";
  if (name.includes("yellow")) return "#d0a431";
  if (name.includes("orange")) return "#c47214";
  if (name.includes("purple") || name.includes("violet")) return "#7a5d90";
  if (name.includes("pink")) return "#be768f";
  if (name.includes("brown") || name.includes("bronze")) return "#8a6847";
  if (name.includes("burgundy")) return "#7d3d47";
  if (name.includes("gold")) return "#b18a2f";
  if (name.includes("rainbow")) return "#9b7bc6";
  return null;
}

function withOpacity(hex: string, opacity: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function iconIdForJob(job: SeedItem): string {
  const blob = `${job.name} ${job.category}`.toLowerCase();
  if (blob.includes("camera")) return "camera";
  if (blob.includes("motor") || blob.includes("servo") || blob.includes("actuator") || blob.includes("pump") || blob.includes("solenoid")) return "actuator";
  if (blob.includes("filament") || blob.includes("resin")) return "spool";
  if (blob.includes("battery")) return "battery";
  if (blob.includes("sensor") || blob.includes("imu") || blob.includes("encoder")) return "chip";
  if (blob.includes("driver") || blob.includes("board") || blob.includes("arduino") || blob.includes("pi")) return "pcb";
  return "inventory";
}

function renderIconPaths(iconId: string, stroke: string): string {
  switch (iconId) {
    case "camera":
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h3l1.6-2h4.8L16 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/></g>`;
    case "actuator":
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2"/><path d="M8 12h4l2-3h4"/><path d="M14 12h4l2 3"/><rect x="10" y="10.5" width="4" height="3" rx="0.5"/></g>`;
    case "spool":
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4" width="10" height="16" rx="1.5"/><ellipse cx="12" cy="12" rx="3.5" ry="8"/></g>`;
    case "battery":
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="13" height="10" rx="2"/><path d="M18 10h2v4h-2"/><path d="M10 10v4"/><path d="M8 12h4"/></g>`;
    case "pcb":
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="6" width="14" height="12" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M11 10h4"/><path d="M11 14h6"/><path d="M9 18v2M13 18v2M17 18v2M9 4v2M13 4v2M17 4v2"/></g>`;
    case "chip":
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M7 9H4M7 12H4M7 15H4M20 9h-3M20 12h-3M20 15h-3M9 7V4M12 7V4M15 7V4M9 20v-3M12 20v-3M15 20v-3"/></g>`;
    default:
      return `<g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/><path d="M8 6v12"/></g>`;
  }
}

function cleanupTempFiles(): void {
  rmSync(batchPath, { force: true });
  rmSync(remoteDir, { recursive: true, force: true });
  rmSync(svgDir, { recursive: true, force: true });
  rmSync(pngDir, { recursive: true, force: true });
}

async function main(): Promise<void> {
  const force = hasFlag("--force");
  const limit = parseLimit();
  const openAiOnly = hasFlag("--openai-only");
  const localOnly = hasFlag("--local");
  const jobs = planJobs(force, limit);

  if (jobs.length === 0) {
    console.log("All seeded part type art assets already exist.");
    return;
  }

  console.log(`Generating ${jobs.length} seeded part type artwork tile${jobs.length === 1 ? "" : "s"}...`);
  ensureWorkingDirs();

  let usedLocalFallback = localOnly;
  try {
    if (localOnly) {
      throw new Error("local-only");
    }
    writeBatchFile(jobs);
    generateRemoteAssets();
    for (const job of jobs) {
      cropRemoteAsset(job);
      console.log(`✓ ${job.name}`);
    }
  } catch (error) {
    if (openAiOnly || (!localOnly && error instanceof Error && error.message === "local-only")) {
      throw error;
    }
    if (!localOnly) {
      console.warn("OpenAI image generation failed; falling back to local vector artwork.");
    }
    usedLocalFallback = true;
    for (const job of jobs) {
      generateLocalAsset(job);
      console.log(`✓ ${job.name}`);
    }
  } finally {
    cleanupTempFiles();
  }

  console.log(`Artwork written to ${finalDir}${usedLocalFallback ? " (local fallback)" : ""}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
