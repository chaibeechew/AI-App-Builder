"use client";

import { useEffect } from "react";

const PREFETCH_PATHS = new Set(["/credits", "/my-apps", "/templates", "/studio"]);

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

    const tiles = Array.from(document.querySelectorAll(".premiumHome .styleRail i, .premiumHome .templateRail i"));
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
        { rootMargin: "120px 80px", threshold: 0.01 }
      );
      for (const tile of tiles) observer.observe(tile);
    } else {
      for (const tile of tiles) tile.classList.add("asset-ready");
    }

    return () => {
      window.fetch = originalFetch;
      observer?.disconnect();
    };
  }, []);

  return null;
}
