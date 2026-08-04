const CACHE_NAME = "passagem-uti-v5-2-online-pdf-1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./attachment-contract.mjs",
  "./tutorial.html",
  "./tutorial.css",
  "./manifest.webmanifest",
  "./assets/apple-touch-icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo-header-256.png",
  "./assets/icons.svg",
  "./assets/logo-passagem-uti-commercial.png",
  "./output/pdf/Tutorial_Ilustrado_Passagem_UTI_v5.pdf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        if (response.ok && /\.(?:html|css|js|mjs|png|svg|webp|pdf|webmanifest)$/i.test(url.pathname)) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
