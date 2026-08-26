"use client";

import { useState } from "react";

export default function AdminPromoPage() {
  const [form, setForm] = useState({ description: "", freeDays: 90, bonusCredits: 0, maxRedemptions: 1, startsAt: "", expiresAt: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/promo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          freeDays: Number(form.freeDays),
          bonusCredits: Number(form.bonusCredits),
          maxRedemptions: Number(form.maxRedemptions),
          startsAt: form.startsAt || null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create promo code.");
      setResult(data.promo);
    } catch (e) {
      setError(e.message || "Unable to create promo code.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Promo Codes</h1>
      <p>Create controlled marketing access for campaigns, partners and promotions.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 24 }}>
        <label>Description<input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Marketing campaign" maxLength={500} /></label>
        <label>Free access (days)<input type="number" min="0" max="3650" value={form.freeDays} onChange={(e) => update("freeDays", e.target.value)} /></label>
        <label>Bonus Credits<input type="number" min="0" max="1000000000" value={form.bonusCredits} onChange={(e) => update("bonusCredits", e.target.value)} /></label>
        <label>Maximum redemptions<input type="number" min="1" max="10000000" value={form.maxRedemptions} onChange={(e) => update("maxRedemptions", e.target.value)} /></label>
        <label>Starts at<input type="datetime-local" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} /></label>
        <label>Expires at<input type="datetime-local" value={form.expiresAt} onChange={(e) => update("expiresAt", e.target.value)} /></label>
        <button disabled={loading} type="submit">{loading ? "Generating…" : "Generate Promo Code"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && <section style={{ marginTop: 24 }}><h2>Promo Created</h2><p style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>{result.code}</p><p>{result.freeDays} free days · {result.bonusCredits} Credits · {result.maxRedemptions} redemptions</p><p>Keep this code private until you are ready to market it.</p></section>}
      <style jsx>{`label{display:grid;gap:6px;font-weight:600}input,button{font:inherit;padding:10px;border:1px solid #ccc;border-radius:8px}button{cursor:pointer;font-weight:700}`}</style>
    </main>
  );
}
