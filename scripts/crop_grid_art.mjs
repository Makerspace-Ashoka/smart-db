#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

function arg(name, fallback = null) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
}

const input = arg("input");
const rows = Number.parseInt(arg("rows", "0"), 10);
const cols = Number.parseInt(arg("cols", "0"), 10);
const outputsRaw = arg("outputs");
const insetPct = Number.parseFloat(arg("inset", "0.08"));

if (!input || !rows || !cols || !outputsRaw) {
  console.error("Usage: node crop_grid_art.mjs --input <png> --rows <n> --cols <n> --outputs <comma-separated>");
  process.exit(1);
}

const outputs = outputsRaw.split(",").map((value) => value.trim()).filter(Boolean);
const meta = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", input], { encoding: "utf8" });
const width = Number.parseInt((/pixelWidth:\s+(\d+)/.exec(meta) ?? [])[1] ?? "", 10);
const height = Number.parseInt((/pixelHeight:\s+(\d+)/.exec(meta) ?? [])[1] ?? "", 10);

if (!Number.isFinite(width) || !Number.isFinite(height)) {
  console.error("Could not read image dimensions.");
  process.exit(1);
}

const cellWidth = width / cols;
const cellHeight = height / rows;
const insetX = Math.round(cellWidth * insetPct);
const insetY = Math.round(cellHeight * insetPct);
const cropWidth = Math.round(cellWidth - insetX * 2);
const cropHeight = Math.round(cellHeight - insetY * 2);

const tempRoot = mkdtempSync(resolve(tmpdir(), "smartdb-crop-grid-"));

try {
  outputs.forEach((output, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = Math.round(col * cellWidth + insetX);
    const y = Math.round(row * cellHeight + insetY);
    const tempPng = resolve(tempRoot, `crop-${index}.png`);

    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        input,
        "-vf",
        `crop=${cropWidth}:${cropHeight}:${x}:${y},scale=720:720:flags=lanczos`,
        tempPng,
      ],
      { stdio: "inherit" },
    );
    execFileSync("cwebp", ["-quiet", "-q", "88", tempPng, "-o", output], { stdio: "inherit" });
  });
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
