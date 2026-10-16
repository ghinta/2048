// The build replaces these two constants with its content hash and exact URLs.
const VERSION = "development";
const APP_SHELL = [];
const CACHE_PREFIX = `2048-shell:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const shellURLs = new Set(APP_SHELL.map((path) => new URL(path, self.registration.scope).href));
const fromAppCache = (request) => caches.open(CACHE_NAME).then((cache) => cache.match(request));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Updates wait for existing app windows to close, preserving their assets.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const root = new URL(self.registration.scope);
  if (url.origin !== root.origin) return;
  if (event.request.mode === "navigate" && (url.pathname === root.pathname || url.pathname === `${root.pathname}index.html`)) {
    // Online navigation gets the latest release; offline always gets a complete shell.
    event.respondWith(fetch(event.request).then((response) => response.ok ? response : fromAppCache(root.href).then((cached) => cached || response)).catch(() => fromAppCache(root.href)));
  } else if (shellURLs.has(url.href)) {
    event.respondWith(fromAppCache(event.request).then((cached) => cached || fetch(event.request)));
  }
});
