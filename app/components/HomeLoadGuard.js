"use client";

import { useEffect } from "react";

const PREFETCH_PATHS = new Set(["/credits", "/my-apps", "/templates", "/studio", "/image-studio"]);

function requestHeaders(input, init) {
  try {
    if (init?.headers) return new Headers(init.headers);
    if (typeof Request !== "undefined" && input instanceof Request) return new Headers(input.headers);
  } catch {}
  return new Headers();
}

export default function HomeLoadGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/") return;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const rawUrl = typeof input === "string" ? input : input?.url;
        const url = new URL(rawUrl || "", window.location.href);
        const headers = requestHeaders(input, init);
        const isRouterPrefetch =
          headers.get("next-router-prefetch") === "1" ||
          headers.get("purpose") === "prefetch" ||
          String(headers.get("sec-purpose") || "").includes("prefetch");

        if (url.origin === window.location.origin && PREFETCH_PATHS.has(url.pathname) && isRouterPrefetch) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
      } catch {}
      return originalFetch(input, init);
    };

    const styleTiles = Array.from(document.querySelectorAll(".premiumHome .styleRail i"));
    const templateTiles = Array.from(document.querySelectorAll(".premiumHome .templateRail i"));

    /* The first visible choices should never wait for IntersectionObserver.
       This prevents blank cards on iPhone/4G while still keeping later images deferred. */
    styleTiles.slice(0, 3).forEach((tile) => tile.classList.add("asset-ready"));
    templateTiles.slice(0, 2).forEach((tile) => tile.classList.add("asset-ready"));
    document.querySelector(".premiumHome .styleRail button.chosen i")?.classList.add("asset-ready");

    const deferredTiles = [...styleTiles.slice(3), ...templateTiles.slice(2)].filter(
      (tile) => !tile.classList.contains("asset-ready")
    );
    let observer = null;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("asset-ready");
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: "420px 120px", threshold: 0.01 }
      );
      for (const tile of deferredTiles) observer.observe(tile);
    } else {
      for (const tile of deferredTiles) tile.classList.add("asset-ready");
    }

    return () => {
      window.fetch = originalFetch;
      observer?.disconnect();
    };
  }, []);

  return null;
}
