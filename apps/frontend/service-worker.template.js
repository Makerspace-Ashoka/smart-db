const SMART_DB_SW_VERSION = "smart-db-pwa-v1";
const APP_SHELL_CACHE = `${SMART_DB_SW_VERSION}:app-shell`;
const RUNTIME_CACHE = `${SMART_DB_SW_VERSION}:runtime`;
const APP_SHELL_URLS = __SMART_DB_APP_SHELL_URLS__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("smart-db-pwa-") && cacheName !== APP_SHELL_CACHE && cacheName !== RUNTIME_CACHE)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApiRequest(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isRuntimeStaticRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isApiRequest(url) {
  return url.pathname === "/api" || url.pathname.endsWith("/api") || url.pathname.includes("/api/");
}

function isRuntimeStaticRequest(request, url) {
  if (url.pathname.endsWith(".wasm")) {
    return true;
  }
  return ["font", "image", "manifest", "script", "style", "worker"].includes(request.destination);
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedResponse =
      await caches.match(request) ??
      await caches.match("./") ??
      await caches.match("index.html");
    return cachedResponse ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request) ?? await caches.match(request);
  const networkResponsePromise = fetch(request).then((response) => {
    if (response.ok) {
      void cache.put(request, response.clone());
    }
    return response;
  });

  return cachedResponse ?? networkResponsePromise;
}
