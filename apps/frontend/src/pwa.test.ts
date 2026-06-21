import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerPwa } from "./pwa";

const serviceWorkerTemplatePath = resolve(process.cwd(), "apps/frontend/service-worker.template.js");

function windowStub(origin = "https://smartdb.example.com") {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  return {
    location: { origin },
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.set(type, listener);
    }),
    dispatch(type: string) {
      const listener = listeners.get(type);
      if (typeof listener === "function") {
        listener(new Event(type));
      }
    },
  };
}

describe("registerPwa", () => {
  it("does nothing when disabled", () => {
    const worker = { register: vi.fn() } as unknown as ServiceWorkerContainer;
    const win = windowStub();

    registerPwa({ enabled: false, serviceWorker: worker, windowRef: win as unknown as Window });

    expect(win.addEventListener).not.toHaveBeenCalled();
    expect(worker.register).not.toHaveBeenCalled();
  });

  it("registers the service worker on load with a normalized scope", () => {
    const worker = { register: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerContainer;
    const win = windowStub("https://smartdb.example.com");

    registerPwa({
      enabled: true,
      baseUrl: "lab",
      serviceWorker: worker,
      windowRef: win as unknown as Window,
    });

    expect(worker.register).not.toHaveBeenCalled();
    win.dispatch("load");

    expect(worker.register).toHaveBeenCalledWith(
      "https://smartdb.example.com/lab/service-worker.js",
      { scope: "/lab/" },
    );
  });

  it("logs registration failures without breaking app startup", async () => {
    const failure = new Error("registration blocked");
    const worker = { register: vi.fn().mockRejectedValue(failure) } as unknown as ServiceWorkerContainer;
    const logger = { warn: vi.fn() };
    const win = windowStub();

    registerPwa({
      enabled: true,
      serviceWorker: worker,
      windowRef: win as unknown as Window,
      logger,
    });
    win.dispatch("load");
    await Promise.resolve();

    expect(logger.warn).toHaveBeenCalledWith(
      "Smart DB service worker registration failed.",
      failure,
    );
  });

  it("serves precached static assets before falling back to network", () => {
    const template = readFileSync(serviceWorkerTemplatePath, "utf8");

    expect(template).toContain("await cache.match(request) ?? await caches.match(request)");
  });
});
