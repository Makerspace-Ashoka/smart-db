export interface RegisterPwaOptions {
  readonly enabled?: boolean;
  readonly baseUrl?: string;
  readonly serviceWorker?: ServiceWorkerContainer | null;
  readonly windowRef?: Pick<Window, "addEventListener" | "location"> | null;
  readonly logger?: Pick<Console, "warn">;
}

export type PwaInstallDevice = "ios" | "android" | "desktop";

export interface PwaInstallPromptState {
  readonly visible: boolean;
  readonly device: PwaInstallDevice;
  readonly canPrompt: boolean;
  readonly installing: boolean;
  readonly dismissed: boolean;
  readonly neverShowAgain: boolean;
  readonly installed: boolean;
}

export type PwaInstallRequestResult = "accepted" | "dismissed" | "installed" | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: readonly string[];
  readonly userChoice: Promise<{ readonly outcome: "accepted" | "dismissed"; readonly platform: string }>;
  prompt(): Promise<void>;
}

interface PwaNavigatorLike {
  readonly userAgent?: string;
  readonly maxTouchPoints?: number;
  readonly standalone?: boolean;
}

interface PwaInstallWindow {
  readonly navigator?: PwaNavigatorLike;
  readonly matchMedia?: Window["matchMedia"];
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

export interface PwaInstallControllerOptions {
  readonly enabled?: boolean;
  readonly windowRef?: PwaInstallWindow | null;
  readonly navigatorRef?: PwaNavigatorLike | null;
  readonly storage?: Pick<Storage, "getItem" | "setItem"> | null;
}

export interface PwaInstallController {
  getSnapshot(): PwaInstallPromptState;
  subscribe(listener: (snapshot: PwaInstallPromptState) => void): () => void;
  requestInstall(): Promise<PwaInstallRequestResult>;
  dismiss(options?: { readonly neverShowAgain?: boolean }): void;
  destroy(): void;
}

export const pwaInstallNeverShowStorageKey = "smartdb:pwa-install-banner:never";

export const defaultPwaInstallPromptState: PwaInstallPromptState = {
  visible: false,
  device: "desktop",
  canPrompt: false,
  installing: false,
  dismissed: false,
  neverShowAgain: false,
  installed: false,
};

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

export function createPwaInstallController(options: PwaInstallControllerOptions = {}): PwaInstallController {
  const enabled = options.enabled ?? true;
  const windowRef =
    options.windowRef ??
    (typeof window === "undefined" ? null : window);
  const navigatorRef =
    options.navigatorRef ??
    windowRef?.navigator ??
    (typeof navigator === "undefined" ? null : navigator);
  const storage =
    options.storage ??
    (typeof localStorage === "undefined" ? null : localStorage);
  const listeners = new Set<(snapshot: PwaInstallPromptState) => void>();

  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  let snapshot = makePwaInstallSnapshot({
    enabled,
    windowRef,
    navigatorRef,
    canPrompt: false,
    installing: false,
    dismissed: false,
    neverShowAgain: readNeverShowAgain(storage),
    installed: false,
  });

  const emit = () => {
    snapshot = makePwaInstallSnapshot({
      enabled,
      windowRef,
      navigatorRef,
      canPrompt: Boolean(deferredPrompt),
      installing: snapshot.installing,
      dismissed: snapshot.dismissed,
      neverShowAgain: snapshot.neverShowAgain,
      installed: snapshot.installed,
    });
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const handleBeforeInstallPrompt = (event: Event) => {
    if (!isBeforeInstallPromptEvent(event)) {
      return;
    }
    event.preventDefault();
    deferredPrompt = event;
    snapshot = { ...snapshot, installing: false };
    emit();
  };

  const handleAppInstalled = () => {
    deferredPrompt = null;
    snapshot = {
      ...snapshot,
      installing: false,
      dismissed: true,
      installed: true,
    };
    emit();
  };

  if (enabled && windowRef) {
    windowRef.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    windowRef.addEventListener("appinstalled", handleAppInstalled);
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
    async requestInstall() {
      if (isPwaStandalone(windowRef, navigatorRef) || snapshot.installed) {
        snapshot = { ...snapshot, installed: true, dismissed: true, installing: false };
        emit();
        return "installed";
      }

      const promptEvent = deferredPrompt;
      if (!promptEvent) {
        return "unavailable";
      }

      deferredPrompt = null;
      snapshot = { ...snapshot, installing: true };
      emit();

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        const accepted = choice.outcome === "accepted";
        snapshot = {
          ...snapshot,
          installing: false,
          dismissed: true,
          installed: accepted,
        };
        emit();
        return accepted ? "accepted" : "dismissed";
      } catch {
        deferredPrompt = promptEvent;
        snapshot = { ...snapshot, installing: false };
        emit();
        return "unavailable";
      }
    },
    dismiss(options = {}) {
      const neverShowAgain = snapshot.neverShowAgain || options.neverShowAgain === true;
      if (neverShowAgain) {
        writeNeverShowAgain(storage);
      }
      snapshot = {
        ...snapshot,
        dismissed: true,
        neverShowAgain,
        installing: false,
      };
      emit();
    },
    destroy() {
      listeners.clear();
      if (windowRef) {
        windowRef.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        windowRef.removeEventListener("appinstalled", handleAppInstalled);
      }
    },
  };
}

function makePwaInstallSnapshot(input: {
  readonly enabled: boolean;
  readonly windowRef: PwaInstallWindow | null;
  readonly navigatorRef: PwaNavigatorLike | null;
  readonly canPrompt: boolean;
  readonly installing: boolean;
  readonly dismissed: boolean;
  readonly neverShowAgain: boolean;
  readonly installed: boolean;
}): PwaInstallPromptState {
  const device = detectPwaInstallDevice(input.navigatorRef);
  const installed = input.installed || isPwaStandalone(input.windowRef, input.navigatorRef);
  return {
    visible: input.enabled &&
      !installed &&
      !input.dismissed &&
      !input.neverShowAgain &&
      (input.canPrompt || device === "ios"),
    device,
    canPrompt: input.canPrompt,
    installing: input.installing,
    dismissed: input.dismissed,
    neverShowAgain: input.neverShowAgain,
    installed,
  };
}

function detectPwaInstallDevice(navigatorRef: PwaNavigatorLike | null): PwaInstallDevice {
  const userAgent = navigatorRef?.userAgent ?? "";
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return "ios";
  }
  if (/Macintosh/i.test(userAgent) && (navigatorRef?.maxTouchPoints ?? 0) > 1) {
    return "ios";
  }
  if (/Android/i.test(userAgent)) {
    return "android";
  }
  return "desktop";
}

function isPwaStandalone(windowRef: PwaInstallWindow | null, navigatorRef: PwaNavigatorLike | null): boolean {
  if (navigatorRef?.standalone === true) {
    return true;
  }
  if (!windowRef?.matchMedia) {
    return false;
  }
  try {
    return windowRef.matchMedia("(display-mode: standalone)").matches ||
      windowRef.matchMedia("(display-mode: fullscreen)").matches ||
      windowRef.matchMedia("(display-mode: minimal-ui)").matches;
  } catch {
    return false;
  }
}

function readNeverShowAgain(storage: Pick<Storage, "getItem" | "setItem"> | null): boolean {
  try {
    return storage?.getItem(pwaInstallNeverShowStorageKey) === "1";
  } catch {
    return false;
  }
}

function writeNeverShowAgain(storage: Pick<Storage, "getItem" | "setItem"> | null): void {
  try {
    storage?.setItem(pwaInstallNeverShowStorageKey, "1");
  } catch {}
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event &&
    typeof (event as { readonly prompt?: unknown }).prompt === "function" &&
    "userChoice" in event;
}
