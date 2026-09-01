"use client";

import { useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

function safeNext(value) {
  const next = String(value || "/").trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/auth")) return "/";
  return next;
}

export default function AuthFlowGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/auth") return;

    const params = new URLSearchParams(window.location.search);
    const referral = String(params.get("ref") || "").trim();
    const next = safeNext(params.get("next"));
    const originalFetch = window.fetch.bind(window);
    let redirected = false;

    // Referral verification is only meaningful when the user actually arrived with a referral code.
    // Returning a local success here avoids an unrelated 400 from blocking the successful OTP flow.
    if (!referral) {
      window.fetch = (input, init) => {
        try {
          const raw = typeof input === "string" ? input : input?.url;
          const url = new URL(raw || "", window.location.href);
          if (url.origin === window.location.origin && url.pathname === "/api/referrals/verify") {
            return Promise.resolve(
              new Response(JSON.stringify({ success: true, referral: null }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            );
          }
        } catch {}
        return originalFetch(input, init);
      };
    }

    const refreshBrandMark = () => {
      const mark = document.querySelector(".authPage .brandMark");
      if (!mark) return;
      mark.textContent = "✦";
      mark.setAttribute("aria-label", "LANERIQ AI");
      mark.style.fontSize = "24px";
      mark.style.lineHeight = "1";
    };

    refreshBrandMark();
    const observer = new MutationObserver(refreshBrandMark);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const supabase = createClient();
    const goHome = (session) => {
      if (!session || redirected) return;
      redirected = true;
      window.location.replace(next);
    };

    supabase.auth.getSession().then(({ data }) => goHome(data?.session)).catch(() => {});
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => goHome(session));

    return () => {
      observer.disconnect();
      authListener?.subscription?.unsubscribe?.();
      if (!referral) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
