"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function GeneratedApp({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.resolve(params).then((value) => setAppId(value.id));
  }, [params]);

  useEffect(() => {
    if (!appId) return;

    fetch(`/api/apps/${appId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "App not found.");
        const currentVersion = (data.versions || []).find(
          (version) => version.id === data.app.current_version_id
        ) || data.versions?.[0];

        setApp({
          ...data.app,
          specification: currentVersion?.specification || {},
          version: currentVersion?.version_no || 1,
        });
      })
      .catch((err) => setError(err?.message || "App not found."));
  }, [appId]);

  if (error) {
    return (
      <main style={{ minHeight: "100vh", padding: 40, fontFamily: "Arial, sans-serif", background: "#f7f7f5" }}>
        <h1>App not found</h1>
        <p>{error}</p>
        <Link href="/my-apps">← My Apps</Link>
      </main>
    );
  }

  if (!app) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif", background: "#f7f7f5" }}>
        Loading your app…
      </main>
    );
  }

  const specification = app.specification || {};
  const pages = Array.isArray(specification.pages) ? specification.pages : [];
  const features = Array.isArray(specification.features) ? specification.features : [];

  return (
    <main style={{ minHeight: "100vh", background: "#f7f7f5", padding: 40, fontFamily: "Arial, sans-serif", color: "#162019" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#8a7132", fontWeight: 800 }}>VERSION {app.version}</div>
            <h1>{app.name}</h1>
            <p style={{ color: "#666" }}>{app.description}</p>
          </div>
          <Link href={`/editor/${app.id}`} style={{ padding: "11px 15px", borderRadius: 10, background: "#d8bf62", color: "#111", textDecoration: "none", fontWeight: 800 }}>
            Continue editing
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, marginTop: 40 }}>
          <aside style={{ background: "#fff", padding: 20, borderRadius: 14, border: "1px solid #ddd" }}>
            <h3>Navigation</h3>
            {pages.map((page, index) => (
              <div key={`${page?.name}-${index}`} style={{ padding: "10px 0" }}>
                {page?.name || `Page ${index + 1}`}
              </div>
            ))}
          </aside>

          <section style={{ background: "#fff", padding: 28, borderRadius: 14, border: "1px solid #ddd" }}>
            <h2>{pages[0]?.name || "Dashboard"}</h2>
            <p>{pages[0]?.purpose || "Your saved AI-generated application."}</p>
            <h3>Features</h3>
            {features.length ? features.map((feature, index) => (
              <div key={`${feature?.name}-${index}`} style={{ padding: 16, marginTop: 12, border: "1px solid #eee", borderRadius: 10 }}>
                <strong>{feature?.name || "Feature"}</strong>
                <p style={{ color: "#666" }}>{feature?.description || "AI-generated feature."}</p>
              </div>
            )) : <p style={{ color: "#666" }}>No feature details were generated.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
