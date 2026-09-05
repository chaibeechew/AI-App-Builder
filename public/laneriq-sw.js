const SHELL_CACHE = "laneriq-safe-shell-2026-09-05-v1";
const STATIC_CACHE = "laneriq-static-2026-09-05-v1";
const SAFE_SHELL_PATHS = new Set(["/", "/offline"]);
const SAFE_DYNAMIC_SHELL = /^\/(?:editor|generated)\/[0-9a-f-]{36}\/?$/iu;

function sameOrigin(url) {
  try { return new URL(url, self.location.origin).origin === self.location.origin; } catch { return false; }
}

function cacheableStatic(url) {
  const parsed = new URL(url, self.location.origin);
  return parsed.origin === self.location.origin && (
    parsed.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|woff2?|png|jpe?g|webp|svg|ico)$/iu.test(parsed.pathname)
  );
}

function safeShellPath(pathname) {
  return SAFE_SHELL_PATHS.has(pathname) || SAFE_DYNAMIC_SHELL.test(pathname);
}

async function cacheShellDocument(path) {
  if (!safeShellPath(path)) return;
  const response = await fetch(path, { cache: "reload", credentials: "same-origin" });
  if (!response.ok) return;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return;
  const html = await response.clone().text();
  const shell = await caches.open(SHELL_CACHE);
  await shell.put(path, response.clone());
  const staticUrls = new Set();
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/giu)) {
    const raw = match[1];
    if (sameOrigin(raw) && cacheableStatic(raw)) staticUrls.add(new URL(raw, self.location.origin).pathname + new URL(raw, self.location.origin).search);
  }
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all([...staticUrls].map(async (url) => {
    try {
      const asset = await fetch(url, { cache: "reload", credentials: "same-origin" });
      if (asset.ok) await staticCache.put(url, asset);
    } catch {}
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([...SAFE_SHELL_PATHS].map((path) => cacheShellDocument(path))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("laneriq-") && key !== SHELL_CACHE && key !== STATIC_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_SAFE_ROUTE") return;
  const path = String(event.data?.path || "");
  if (!safeShellPath(path)) return;
  event.waitUntil(cacheShellDocument(path).catch(() => {}));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) {
    event.respondWith(fetch(request));
    return;
  }

  if (cacheableStatic(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && safeShellPath(url.pathname)) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        if (safeShellPath(url.pathname)) {
          const exact = await cache.match(url.pathname);
          if (exact) return exact;
        }
        return (await cache.match("/offline")) || Response.error();
      }
    })());
  }
});
