"use client";

import { usePathname } from "next/navigation";

export default function GameCommercialTermsNotice() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/game-builder")) return null;

  return (
    <aside className="gameTerms" aria-label="LANERIQ AI game commercial terms">
      <b>GAME CREATOR POLICY</b>
      <span>LANERIQ AI encourages creation; normal genuine use is included</span>
      <span>Professional cooldowns affect new Game starts only; App, Website and ordinary features remain available</span>
      <span>Professional cooldown path: 30m → 1h → 2h → 4h → max 8h, then Game creation automatically resumes</span>
      <span>Full Access removes the ordinary progressive Game cooldown; security and abuse safeguards still apply</span>
      <span>You keep ownership of your game · No game buyout license</span>
      <span>Continuing 5% LANERIQ AI share of game sales revenue across every sales channel, including sales outside LANERIQ AI</span>
      <span>The 5% sales-share obligation continues after creator-plan access ends</span>
      <style jsx>{`
        .gameTerms{position:fixed;z-index:9000;right:14px;bottom:14px;width:min(430px,calc(100% - 28px));display:grid;grid-template-columns:auto 1fr;gap:6px 12px;padding:14px 16px;border:1px solid rgba(229,199,103,.42);border-radius:17px;background:rgba(3,19,15,.93);backdrop-filter:blur(18px);box-shadow:0 18px 55px rgba(0,0,0,.4);color:#e7eee9}
        b{grid-column:1/-1;color:#e5c767;font-size:10px;letter-spacing:.14em}
        span{grid-column:1/-1;font-size:11px;line-height:1.45;color:#bdcbc5}
        span:before{content:"✓ ";color:#e5c767;font-weight:900}
        @media(max-width:600px){.gameTerms{position:relative;right:auto;bottom:auto;margin:12px auto;width:calc(100% - 28px)}}
      `}</style>
    </aside>
  );
}
