export interface RegisterPwaOptions {
  readonly enabled?: boolean;
  readonly baseUrl?: string;
  readonly serviceWorker?: ServiceWorkerContainer | null;
  readonly windowRef?: Pick<Window, "addEventListener" | "location"> | null;
  readonly logger?: Pick<Console, "warn">;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed || trimmed === ".") {
    return "/";
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function registerPwa(options: RegisterPwaOptions = {}): void {
  const enabled = options.enabled ?? import.meta.env.PROD;
  const serviceWorker =
    options.serviceWorker ??
    (typeof navigator === "undefined" ? null : navigator.serviceWorker);
  const windowRef =
    options.windowRef ??
    (typeof window === "undefined" ? null : window);

  if (!enabled || !serviceWorker || !windowRef) {
    return;
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl ?? import.meta.env.BASE_URL ?? "/");
  const workerUrl = new URL("service-worker.js", `${windowRef.location.origin}${baseUrl}`).toString();
  const logger = options.logger ?? console;

  windowRef.addEventListener("load", () => {
    void serviceWorker.register(workerUrl, { scope: baseUrl }).catch((error: unknown) => {
      logger.warn("Smart DB service worker registration failed.", error);
    });
  });
}
