"use client";

import { useEffect, useState } from "react";

export default function CreditsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/credits", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || "Unable to load credits.");
        return json;
      })
      .then((json) => { if (active) setData(json); })
      .catch((err) => { if (active) setError(err?.message || "Unable to load credits."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const balance = Number(data?.balance ?? 0);
  const ledger = Array.isArray(data?.ledger) ? data.ledger : [];

  return (
    <main className="creditsPage">
      <div className="creditsShell">
        <div className="eyebrow">ACCOUNT</div>
        <h1>Credits</h1>
        <p className="intro">Your AI usage balance and credit activity.</p>

        <section className="balanceCard">
          <span>Available Credits</span>
          <strong>{loading ? "—" : balance.toLocaleString()}</strong>
          <small>Credits are managed securely on the server.</small>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="historyCard">
          <div className="historyHeader"><h2>Credit History</h2><span>{ledger.length} records</span></div>
          {loading ? <div className="empty">Loading...</div> : ledger.length === 0 ? <div className="empty">No credit activity yet.</div> : (
            <div className="ledger">
              {ledger.map((item) => (
                <div className="ledgerRow" key={item.id}>
                  <div><strong>{item.type || "Activity"}</strong><p>{item.description || "Credit activity"}</p></div>
                  <div className={Number(item.amount) >= 0 ? "amount positive" : "amount"}>{Number(item.amount) >= 0 ? "+" : ""}{Number(item.amount).toLocaleString()}</div>
                  <time>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <style jsx>{`
        .creditsPage{min-height:100vh;padding:90px 20px 60px;background:#03100d;color:#f4f0df}.creditsShell{width:min(900px,100%);margin:auto}.eyebrow{letter-spacing:.18em;font-size:11px;color:#d8bf62;font-weight:800}.creditsShell h1{font-size:42px;margin:8px 0}.intro{color:#9fa9a4}.balanceCard,.historyCard{margin-top:24px;border:1px solid rgba(216,191,98,.18);border-radius:20px;background:rgba(8,27,22,.82);padding:24px;box-shadow:0 18px 50px rgba(0,0,0,.2)}.balanceCard span{display:block;color:#aab4ae;font-size:13px}.balanceCard strong{display:block;font-size:48px;margin:8px 0;color:#d8bf62}.balanceCard small{color:#71807a}.historyHeader{display:flex;justify-content:space-between;align-items:center}.historyHeader h2{margin:0}.historyHeader span{font-size:12px;color:#82908a}.ledger{margin-top:14px}.ledgerRow{display:grid;grid-template-columns:1fr auto auto;gap:18px;align-items:center;padding:16px 0;border-top:1px solid rgba(255,255,255,.06)}.ledgerRow p{margin:4px 0 0;color:#8d9993;font-size:13px}.amount{font-weight:800}.positive{color:#9ed3a4}.ledgerRow time{font-size:11px;color:#68756f;min-width:145px;text-align:right}.empty,.error{padding:24px 0;color:#8d9993}.error{color:#e6a3a3}@media(max-width:650px){.creditsPage{padding-top:80px}.creditsShell h1{font-size:34px}.ledgerRow{grid-template-columns:1fr auto}.ledgerRow time{grid-column:1/-1;text-align:left;min-width:0}}
      `}</style>
    </main>
  );
}
