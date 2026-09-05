const SHELL_CACHE = "laneriq-safe-shell-2026-09-05-v2";
const STATIC_CACHE = "laneriq-static-2026-09-05-v2";
const PUBLIC_PRECACHE_SHELL_PATHS = new Set(["/"]);
const PRIVATE_SHELL_PATHS = new Set(["/offline"]);
const PRIVATE_DYNAMIC_SHELL = /^\/(?:editor|generated)\/[0-9a-f-]{36}\/?$/iu;

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

function isPrivateShellPath(pathname) {
  return PRIVATE_SHELL_PATHS.has(pathname) || PRIVATE_DYNAMIC_SHELL.test(pathname);
}

function safeShellPath(pathname) {
  return PUBLIC_PRECACHE_SHELL_PATHS.has(pathname) || isPrivateShellPath(pathname);
}

function exactSuccessfulShellResponse(response, requestedPath) {
  if (!response?.ok || response.redirected || response.type === "opaqueredirect") return false;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return false;
  try {
    const requested = new URL(requestedPath, self.location.origin);
    const resolved = new URL(response.url);
    return resolved.origin === self.location.origin && resolved.pathname === requested.pathname;
  } catch {
    return false;
  }
}

async function cacheStaticReferences(html) {
  const staticUrls = new Set();
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/giu)) {
    const raw = match[1];
    if (sameOrigin(raw) && cacheableStatic(raw)) {
      const parsed = new URL(raw, self.location.origin);
      staticUrls.add(parsed.pathname + parsed.search);
    }
  }
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all([...staticUrls].map(async (url) => {
    try {
      const asset = await fetch(url, { cache: "reload", credentials: "same-origin" });
      if (asset.ok && !asset.redirected) await staticCache.put(url, asset);
    } catch {}
  }));
}

async function cacheShellDocument(path, { allowPrivate = false } = {}) {
  if (!safeShellPath(path)) return false;
  if (isPrivateShellPath(path) && !allowPrivate) return false;
  const response = await fetch(path, { cache: "reload", credentials: "same-origin", redirect: "follow" });
  if (!exactSuccessfulShellResponse(response, path)) return false;
  const html = await response.clone().text();
  const shell = await caches.open(SHELL_CACHE);
  await shell.put(path, response.clone());
  await cacheStaticReferences(html);
  return true;
}

async function clearPrivateShells() {
  const shell = await caches.open(SHELL_CACHE);
  const requests = await shell.keys();
  await Promise.all(requests.map(async (request) => {
    const pathname = new URL(request.url).pathname;
    if (isPrivateShellPath(pathname)) await shell.delete(request);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([...PUBLIC_PRECACHE_SHELL_PATHS].map((path) => cacheShellDocument(path))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("laneriq-") && key !== SHELL_CACHE && key !== STATIC_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_SHELL") {
    event.waitUntil(clearPrivateShells().catch(() => {}));
    return;
  }
  if (event.data?.type !== "CACHE_SAFE_ROUTE") return;
  const path = String(event.data?.path || "");
  if (!isPrivateShellPath(path)) return;
  event.waitUntil(cacheShellDocument(path, { allowPrivate: true }).catch(() => {}));
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
      if (response.ok && !response.redirected) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (safeShellPath(url.pathname) && exactSuccessfulShellResponse(response, url.pathname)) {
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
        return (await cache.match("/")) || Response.error();
      }
    })());
  }
});
