"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [preview, setPreview] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [error, setError] = useState("");

  async function generateApp() {
    if (!idea.trim()) return;

    setLoading(true);
    setError("");
    setPlan(null);
    setPreview(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: idea.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Generation failed");
      }

      setPlan(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function continueToPreview() {
    setPreview(true);
    setActivePage(
      plan?.specification?.pages?.[0]?.name || "Dashboard"
    );
  }

  if (preview && plan?.specification) {
    const specification = plan.specification;
    const pages = specification.pages || [];
    const features = specification.features || [];

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f7f9",
          fontFamily: "Arial, sans-serif",
          display: "flex",
        }}
      >
        <aside
          style={{
            width: 240,
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            padding: 24,
          }}
        >
          <h2 style={{ marginBottom: 8 }}>
            {specification.name || "My App"}
          </h2>

          <p
            style={{
              color: "#6b7280",
              fontSize: 13,
              marginBottom: 28,
            }}
          >
            App Preview
          </p>

          {pages.map((page) => (
            <button
              key={page.name}
              onClick={() => setActivePage(page.name)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background:
                  activePage === page.name
                    ? "#111827"
                    : "transparent",
                color:
                  activePage === page.name
                    ? "#ffffff"
                    : "#374151",
              }}
            >
              {page.name}
            </button>
          ))}

          <button
            onClick={() => setPreview(false)}
            style={{
              marginTop: 30,
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ← Back to Plan
          </button>
        </aside>

        <section style={{ flex: 1, padding: 36 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 30,
              minHeight: "calc(100vh - 72px)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 30,
              }}
            >
              <div>
                <h1 style={{ margin: 0 }}>{activePage}</h1>
                <p style={{ color: "#6b7280" }}>
                  Interactive App Preview
                </p>
              </div>

              <span
                style={{
                  padding: "7px 12px",
                  borderRadius: 20,
                  background: "#ecfdf5",
                  color: "#047857",
                  fontSize: 13,
                }}
              >
                Preview
              </span>
            </div>

            <div
              style={{
                padding: 22,
                background: "#f9fafb",
                borderRadius: 12,
                marginBottom: 24,
              }}
            >
              <h3>{activePage}</h3>

              <p style={{ color: "#6b7280" }}>
                {pages.find((p) => p.name === activePage)?.purpose ||
                  "App page preview"}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {features.map((feature) => (
                <div
                  key={feature.name}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {feature.name}
                  </h3>

                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {feature.description}
                  </p>

                  <button
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 7,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1>AI App Builder</h1>

        <p style={{ color: "#6b7280" }}>
          Turn your idea into a working app.
        </p>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe the app you want to build..."
          style={{
            width: "100%",
            minHeight: 150,
            marginTop: 24,
            padding: 16,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />

        <button
          onClick={generateApp}
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "14px 22px",
            borderRadius: 9,
            border: "none",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate with AI"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {plan?.specification && (
          <section
            style={{
              marginTop: 30,
              background: "#ffffff",
              padding: 26,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
            }}
          >
            <h2>
              {plan.specification.name || "Your App"}
            </h2>

            <p style={{ color: "#6b7280" }}>
              {plan.specification.description}
            </p>

            <h3>App Pages</h3>

            {(plan.specification.pages || []).map(
              (page, index) => (
                <div
                  key={page.name}
                  style={{
                    padding: 14,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <strong>
                    {index + 1}. {page.name}
                  </strong>

                  <div
                    style={{
                      color: "#6b7280",
                      marginTop: 5,
                    }}
                  >
                    {page.purpose}
                  </div>
                </div>
              )
            )}

            <button
              onClick={continueToPreview}
              style={{
                marginTop: 24,
                padding: "14px 24px",
                borderRadius: 9,
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Confirm & Continue →
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
