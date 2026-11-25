// Without a connection, pages the browser has to load (opened, reloaded) show offline.html instead of the browser's own error,
// as on YouTube. While there is a connection it does nothing at all: the browser loads every page itself, and nothing is kept.
const CACHE = "deeni-offline-2";
const PAGE = "/offline.html";
const FILES = [PAGE, "/logo-header.webp", "/logo-header-dark.webp"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("deeni-offline-") && key !== CACHE) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.disable();
      await self.clients.claim();
    })()
  );
});
self.addEventListener("fetch", (e) => {
  if (navigator.onLine) return;
  const { request } = e;
  const url = new URL(request.url);
  if (request.mode === "navigate") e.respondWith(fetch(request).catch(async () => (await caches.match(PAGE)) || Response.error()));
  // The offline page's own pictures
  else if (request.method === "GET" && url.origin === location.origin && FILES.includes(url.pathname)) e.respondWith(fetch(request).catch(async () => (await caches.match(url.pathname)) || Response.error()));
});
