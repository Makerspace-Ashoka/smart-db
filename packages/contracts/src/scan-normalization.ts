const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const DASH_VARIANTS = /[‐‑‒–—―﹘﹣－_]/g;
const MULTISPACE = /\s+/g;
const SPACE_AROUND_DASH = /\s*-\s*/g;
const COMPACT_SEPARATORS = /[\s-]+/g;

export function sanitizeScannedCode(input: string): string {
  return input
    .normalize("NFKC")
    .replace(CONTROL_CHARS, "")
    .trim();
}

function normalizeFlexibleScannedCode(input: string): string {
  return sanitizeScannedCode(input)
    .replace(DASH_VARIANTS, "-")
    .replace(MULTISPACE, " ")
    .replace(SPACE_AROUND_DASH, "-");
}

export function scanLookupCompactKey(input: string): string {
  return normalizeFlexibleScannedCode(input)
    .toLowerCase()
    .replace(COMPACT_SEPARATORS, "");
}
