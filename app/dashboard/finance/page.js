"use client";

import { useEffect, useState } from "react";

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("");
  const [payoutAccountId, setPayoutAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/me", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to load finance data.");
      setData(json);
      setPayoutAccountId(json.payoutAccounts?.find((a) => a.status === "verified")?.id || "");
    } catch (e) { setMessage(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function withdraw(e) {
    e.preventDefault(); setMessage("");
    try {
      const res = await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payoutAccountId: payoutAccountId, amount: Number(amount) }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Withdrawal request failed.");
      setAmount(""); setMessage("Withdrawal request submitted."); await load();
    } catch (e) { setMessage(e.message); }
  }

  if (loading) return <main className="finance-page"><p>Loading finance...</p></main>;

  return (
    <main className="finance-page" style={{ maxWidth: 960, margin: "40px auto", padding: 20 }}>
      <h1>Finance</h1>
      <p>Manage your available earnings, withdrawals and subscription refunds.</p>
      {message && <div role="status" style={{ margin: "16px 0", padding: 12, border: "1px solid currentColor", borderRadius: 8 }}>{message}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, margin: "24px 0" }}>
        <div><strong>Available</strong><br />${Number(data?.cash?.available || 0).toFixed(2)}</div>
        <div><strong>Pending</strong><br />${Number(data?.cash?.pending || 0).toFixed(2)}</div>
        <div><strong>Reserved</strong><br />${Number(data?.cash?.reserved || 0).toFixed(2)}</div>
      </section>

      <section>
        <h2>Withdraw</h2>
        <p>Minimum $10 · Maximum $1,000 per transaction · Daily $2,000 · Monthly $5,000</p>
        <form onSubmit={withdraw} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={payoutAccountId} onChange={(e) => setPayoutAccountId(e.target.value)} required>
            <option value="">Select verified payout account</option>
            {(data?.payoutAccounts || []).filter((a) => a.status === "verified").map((a) => <option key={a.id} value={a.id}>{a.label || "Verified payout account"}</option>)}
          </select>
          <input type="number" min="10" max="1000" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (USD)" required />
          <button type="submit">Request Withdrawal</button>
        </form>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Withdrawal History</h2>
        {(data?.withdrawals || []).length === 0 ? <p>No withdrawals yet.</p> : <ul>{data.withdrawals.map((w) => <li key={w.id}>${Number(w.amount).toFixed(2)} — {w.status} — {new Date(w.requested_at).toLocaleString()}</li>)}</ul>}
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Subscription Refunds</h2>
        {(data?.refunds || []).length === 0 ? <p>No refund requests.</p> : <ul>{data.refunds.map((r) => <li key={r.id}>${Number(r.amount).toFixed(2)} — {r.status} — {new Date(r.created_at).toLocaleString()}</li>)}</ul>}
      </section>
    </main>
  );
}
