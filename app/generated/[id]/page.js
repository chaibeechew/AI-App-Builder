"use client";

import { useEffect, useState } from "react";

export default function GeneratedApp({ params }) {
  const [app, setApp] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`ai-app-${params.id}`);

    if (saved) {
      setApp(JSON.parse(saved));
    }
  }, [params.id]);

  if (!app) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 40,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>App not found</h1>
        <p>This generated app is no longer available on this device.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        padding: 40,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <h1>{app.name}</h1>

        <p style={{ color: "#666" }}>
          {app.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 24,
            marginTop: 40,
          }}
        >
          <aside
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 14,
              border: "1px solid #ddd",
            }}
          >
            <h3>Navigation</h3>

            {app.navigation?.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 0",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </div>
            ))}
          </aside>

          <section
            style={{
              background: "#fff",
              padding: 28,
              borderRadius: 14,
              border: "1px solid #ddd",
            }}
          >
            <h2>Dashboard</h2>

            <p>
              Your AI-generated application is ready.
            </p>

            <h3>Features</h3>

            {app.features?.map((feature) => (
              <div
                key={feature.id}
                style={{
                  padding: 16,
                  marginTop: 12,
                  border: "1px solid #eee",
                  borderRadius: 10,
                }}
              >
                <strong>{feature.name}</strong>

                <p style={{ color: "#666" }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
