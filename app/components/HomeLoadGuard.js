"use client";

import { useEffect } from "react";

const PREFETCH_PATHS = new Set(["/credits", "/my-apps", "/templates", "/studio", "/image-studio"]);

export default function HomeLoadGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/") return;

    let allowPath = "";
    let allowUntil = 0;
    const onClick = (event) => {
      try {
        const anchor = event.target?.closest?.("a[href]");
        if (!anchor) return;
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin && PREFETCH_PATHS.has(url.pathname)) {
          allowPath = url.pathname;
          allowUntil = Date.now() + 8000;
        }
      } catch {}
    };
    window.addEventListener("click", onClick, true);

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const rawUrl = typeof input === "string" ? input : input?.url;
        const url = new URL(rawUrl || "", window.location.href);
        if (url.origin === window.location.origin && PREFETCH_PATHS.has(url.pathname)) {
          const userNavigation = url.pathname === allowPath && Date.now() < allowUntil;
          if (!userNavigation) {
            return Promise.resolve(new Response(null, {
              status: 204,
              headers: { "Cache-Control": "no-store" },
            }));
          }
        }
      } catch {}
      return originalFetch(input, init);
    };

    const styleTiles = Array.from(document.querySelectorAll(".premiumHome .styleRail i"));
    const templateTiles = Array.from(document.querySelectorAll(".premiumHome .templateRail i"));

    /* Load only the currently selected style immediately. Everything else waits
       until it approaches the viewport, preventing a 20MB+ first-load burst. */
    document.querySelector(".premiumHome .styleRail button.chosen i")?.classList.add("asset-ready");

    const deferredTiles = [...styleTiles, ...templateTiles].filter(
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
        { rootMargin: "220px 80px", threshold: 0.01 }
      );
      for (const tile of deferredTiles) observer.observe(tile);
    } else {
      for (const tile of deferredTiles) tile.classList.add("asset-ready");
    }

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("click", onClick, true);
      observer?.disconnect();
    };
  }, []);

  return null;
}
