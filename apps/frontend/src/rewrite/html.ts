export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function attr(value: unknown): string {
  return escapeHtml(value);
}

export function selected(value: boolean): string {
  return value ? " selected" : "";
}

export function checked(value: boolean): string {
  return value ? " checked" : "";
}

export function disabled(value: boolean): string {
  return value ? " disabled" : "";
}

export function hidden(value: boolean): string {
  return value ? " hidden" : "";
}

export function joinHtml(parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join("");
}

