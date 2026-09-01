"use client";

import { useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { normalizeReferralCode, safeInternalNext } from "../../lib/auth/session-safety.js";

export default function AuthFlowGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/auth") return;

    const params = new URLSearchParams(window.location.search);
    const referral = normalizeReferralCode(params.get("ref"));
    const rawNext = params.get("next");
    const next = safeInternalNext(rawNext);
    const originalFetch = window.fetch.bind(window);
    let redirected = false;

    // Keep the visible URL canonical too. The server proxy performs the same check,
    // and this client-side normalization is defense in depth for SPA/history mutations.
    if (rawNext && rawNext !== next) {
      params.set("next", next);
      const search = params.toString();
      window.history.replaceState(window.history.state, "", `/auth${search ? `?${search}` : ""}`);
    }
    if (params.has("ref") && !referral) {
      params.delete("ref");
      const search = params.toString();
      window.history.replaceState(window.history.state, "", `/auth${search ? `?${search}` : ""}`);
    }

    // Referral verification is only meaningful when the user actually arrived with a valid referral code.
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
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
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
    const goNext = (session) => {
      if (!session || redirected) return;
      redirected = true;
      window.location.replace(next);
    };

    supabase.auth.getSession().then(({ data }) => goNext(data?.session)).catch(() => {});
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => goNext(session));

    return () => {
      observer.disconnect();
      authListener?.subscription?.unsubscribe?.();
      if (!referral) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
