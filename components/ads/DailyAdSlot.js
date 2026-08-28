"use client";

import { useEffect, useState } from "react";

function keyFor(userId, date = new Date()) {
  return `soolen:daily-ad:${userId || "anonymous"}:${date.toLocaleDateString("en-CA")}`;
}

export default function DailyAdSlot({ userId = "anonymous", enabled = true, ad = null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !ad || typeof window === "undefined") return;
    const key = keyFor(userId);
    if (window.localStorage.getItem(key) === "shown") return;
    setVisible(true);
  }, [enabled, ad, userId]);

  function dismiss() {
    if (typeof window !== "undefined") window.localStorage.setItem(keyFor(userId), "shown");
    setVisible(false);
  }

  if (!visible || !ad) return null;

  return (
    <div className="daily-ad" role="complementary" aria-label="Daily advertisement">
      <div><span>ADVERTISEMENT</span><b>{ad.title || "Sponsored"}</b><p>{ad.description || "Support independent creators and technology."}</p></div>
      <button type="button" onClick={dismiss} aria-label="Close advertisement">×</button>
      <style jsx>{`
        .daily-ad{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid rgba(15,55,45,.12);border-radius:16px;background:rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(0,0,0,.08);color:#12352c}
        .daily-ad span,.daily-ad b,.daily-ad p{display:block}.daily-ad span{font-size:9px;letter-spacing:.12em;opacity:.55}.daily-ad b{margin-top:2px;font-size:13px}.daily-ad p{margin:2px 0 0;font-size:11px;opacity:.7}.daily-ad button{border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#12352c;opacity:.65}
      `}</style>
    </div>
  );
}
