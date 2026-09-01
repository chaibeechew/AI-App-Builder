"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const GAME_PATTERNS = [
  /\bgame\b/i,/\bgaming\b/i,/\bmario\b/i,/\bmoba\b/i,/\brpg\b/i,/\bfps\b/i,
  /platformer/i,/shooter/i,/racing/i,/tower defense/i,/battle royale/i,/rogueli(?:ke|te)/i,
  /游戏/,/遊戲/,/手游/,/电玩/,/電玩/,/塔防/,/赛车/,/賽車/,/角色扮演/,/射击/,/射擊/,
];

function isGameRequest(value = "") {
  const source = String(value || "").trim();
  return source.length > 0 && GAME_PATTERNS.some((pattern) => pattern.test(source));
}

export default function GameProGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function interceptGameBuild(event) {
      if (window.location.pathname !== "/") return;
      const button = event.target?.closest?.("button");
      if (!button) return;
      const label = String(button.textContent || "").trim();
      const isBuildAction = button.classList.contains("buildCta") || /(?:build|create).*app.*(?:web|website)/i.test(label);
      if (!isBuildAction) return;
      const prompt = document.querySelector("textarea")?.value || "";
      if (!isGameRequest(prompt)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setOpen(true);
    }

    document.addEventListener("click", interceptGameBuild, true);
    return () => document.removeEventListener("click", interceptGameBuild, true);
  }, []);

  if (!open) return null;

  return (
    <div className="gameProOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="gameProDialog" role="dialog" aria-modal="true" aria-labelledby="game-pro-title">
        <button className="gameProClose" type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        <div className="gameProEyebrow">LANERIQ AI · CREATOR PLANS</div>
        <h2 id="game-pro-title">Game creation needs a creator plan</h2>
        <p>LANERIQ AI encourages creation. Professional includes normal genuine Game creation under Fair Use. If unusually heavy repeated Game starts trigger protection, only new Game creation cools down temporarily; App, Website and ordinary tools remain available.</p>
        <div className="planSummary"><span><b>PROFESSIONAL · US$68 / 12 MONTHS</b>30m → 1h → 2h → 4h → max 8h Game-only cooldown on repeated Fair Use triggers. Game creation resumes automatically.</span><span><b>FULL ACCESS · US$199 / 12 MONTHS</b>For high-volume creators. No ordinary progressive Game cooldown; security and abuse safeguards still apply.</span></div>
        <div className="commercialTerms"><b>GAME COMMERCIAL TERMS</b><span>You keep ownership of your game</span><span>No game buyout license</span><span>LANERIQ AI receives a continuing 5% share of game sales revenue when a generated game is sold</span><span>The 5% applies across every sales channel, including App Store, Google Play, Steam, independent websites and direct sales outside LANERIQ AI</span><span>The sales-share obligation continues after creator-plan access ends</span></div>
        <Link className="gameProCta" href="/pricing">VIEW CREATOR PLANS →</Link>
        <button className="gameProSecondary" type="button" onClick={() => setOpen(false)}>Continue with App / Website</button>
      </section>
      <style jsx>{`
        .gameProOverlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:22px;background:rgba(1,7,6,.78);backdrop-filter:blur(16px)}
        .gameProDialog{position:relative;width:min(590px,100%);max-height:min(90vh,800px);overflow:auto;border:1px solid rgba(240,196,83,.62);border-radius:28px;padding:30px;background:linear-gradient(145deg,rgba(5,31,25,.98),rgba(2,13,11,.99));box-shadow:0 30px 90px rgba(0,0,0,.65),0 0 50px rgba(222,169,52,.13);color:#f7f6ef}
        .gameProClose{position:absolute;top:14px;right:16px;width:40px;height:40px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.05);color:#fff;font-size:27px;line-height:1}
        .gameProEyebrow{color:#efc75f;font-size:12px;font-weight:900;letter-spacing:.16em;margin-bottom:13px}
        h2{font-size:clamp(34px,8vw,52px);line-height:.98;letter-spacing:-.045em;margin:0 38px 16px 0}
        p{color:#b9c7c1;line-height:1.65;font-size:16px;margin:0 0 16px}.planSummary{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}.planSummary span{display:grid;gap:7px;padding:13px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(255,255,255,.035);font-size:12px;line-height:1.45;color:#c7d4ce}.planSummary b{color:#efc75f;font-size:10px;letter-spacing:.08em}
        .commercialTerms{display:grid;gap:7px;margin:0 0 20px;padding:14px;border:1px solid rgba(239,199,95,.28);border-radius:15px;background:rgba(239,199,95,.07)}
        .commercialTerms b{font-size:11px;letter-spacing:.12em;color:#efc75f}.commercialTerms span{font-size:13px;color:#d6dfdb;line-height:1.45}.commercialTerms span:before{content:"✓ ";color:#efc75f;font-weight:900}
        .gameProCta{display:block;text-align:center;text-decoration:none;border:1px solid #ffd36e;border-radius:17px;padding:17px 20px;background:linear-gradient(110deg,#b77918,#f1c65f 48%,#a86a12);color:#17170f;font-weight:1000;font-size:18px;box-shadow:0 14px 38px rgba(0,0,0,.35)}
        .gameProSecondary{width:100%;margin-top:10px;border:1px solid rgba(255,255,255,.1);border-radius:15px;padding:14px;background:rgba(255,255,255,.04);color:#d6dfdb;font-weight:800}
        @media(max-width:520px){.gameProDialog{padding:26px 20px 22px;border-radius:24px}p{font-size:15px}.gameProCta{font-size:17px}.planSummary{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
