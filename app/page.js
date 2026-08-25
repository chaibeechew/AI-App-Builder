"use client";

import { useEffect, useState } from "react";

const steps = [
  { label: "Understanding your idea", progress: 10 },
  { label: "Planning app structure", progress: 25 },
  { label: "Generating pages", progress: 45 },
  { label: "Creating features", progress: 65 },
  { label: "Testing your app", progress: 82 },
  { label: "Security check", progress: 95 },
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) return;

    const timer = setInterval(() => {
      setElapsed((value) => value + 0.1);
    }, 100);

    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;

    const timer = setInterval(() => {
      setStepIndex((current) => {
        const next = current + 1;

        if (next >= steps.length) return current;

        setProgress(steps[next].progress);
        return next;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [loading]);

  async function createApp() {
    const value = idea.trim();

    if (!value) {
      setError("Tell me what you want to build.");
      return;
    }

    setLoading(true);
    setProgress(5);
    setStepIndex(-1);
    setElapsed(0);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea: value }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to generate app.");
      }

      setProgress(100);
      setStepIndex(steps.length);

      const generatedApp = data.preview;

      if (generatedApp?.id) {
        localStorage.setItem(
          `ai-app-${generatedApp.id}`,
          JSON.stringify(generatedApp)
        );
      }

      setResult(data);
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #eef7f2 0%, #f7f8f6 42%, #ffffff 100%)",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#111827",
      }}
    >
      <nav
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid #e5e7eb",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          🧠 AI App Builder
        </div>

        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            padding: "7px 12px",
            border: "1px solid #dbe3df",
            borderRadius: 999,
            background: "#fff",
          }}
        >
          Autonomous AI Engine
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "72px 24px 100px",
        }}
      >
        <section style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: 999,
              background: "#e8f5ee",
              color: "#166534",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Build → Test → Preview → Publish
          </div>

          <h1
            style={{
              fontSize: "clamp(42px, 7vw, 72px)",
              lineHeight: 1,
              letterSpacing: "-3px",
              margin: "0 auto 20px",
              maxWidth: 800,
            }}
          >
            Turn your idea into an app.
          </h1>

          <p
            style={{
              fontSize: 20,
              lineHeight: 1.6,
              color: "#64748b",
              maxWidth: 680,
              margin: "0 auto 42px",
            }}
          >
            Describe what you want. AI plans the app, creates the
            structure, tests it and prepares your preview.
          </p>
        </section>

        <section
          style={{
            marginTop: 30,
            background: "#ffffff",
            border: "1px solid #dfe7e2",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Describe your app
          </label>

          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Example: Build a real estate CRM that manages clients, properties, follow-ups and appointments..."
            rows={7}
            disabled={loading}
            style={{
              width: "100%",
              padding: 20,
              fontSize: 17,
              lineHeight: 1.6,
              borderRadius: 16,
              border: "1px solid #d1d5db",
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
              background: "#fafafa",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Free app generation • AI-powered
            </div>

            <button
              onClick={createApp}
              disabled={loading}
              style={{
                padding: "15px 28px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12,
                border: "none",
                background: loading ? "#94a3b8" : "#111827",
                color: "#fff",
                cursor: loading ? "wait" : "pointer",
                minWidth: 150,
              }}
            >
              {loading ? "Building..." : "Create App →"}
            </button>
          </div>
        </section>

        {loading && (
          <section
            style={{
              marginTop: 24,
              padding: 28,
              background: "#ffffff",
              borderRadius: 22,
              border: "1px solid #dfe7e2",
              boxShadow: "0 12px 35px rgba(15,23,42,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <strong>🧠 AI is building your app...</strong>
              <strong>{Math.round(progress)}%</strong>
            </div>

            <div
              style={{
                height: 12,
                background: "#e5e7eb",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#111827,#16a34a)",
                  transition: "width .4s ease",
                }}
              />
            </div>

            <div style={{ marginTop: 26 }}>
              {steps.map((step, index) => {
                const completed = index < stepIndex;
                const active = index === stepIndex;

                return (
                  <div
                    key={step.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 13,
                      color:
                        completed || active ? "#111827" : "#94a3b8",
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    <span>
                      {completed ? "✓" : active ? "●" : "○"}
                    </span>
                    {step.label}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: "1px solid #eef2f0",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Time elapsed: {elapsed.toFixed(1)}s
            </div>
          </section>
        )}

        {error && (
          <section
            style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 16,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
            }}
          >
            ⚠️ {error}
          </section>
        )}

        {result?.specification && (
          <section
            style={{
              marginTop: 30,
              padding: 30,
              background: "#ffffff",
              borderRadius: 22,
              border: "1px solid #dfe7e2",
              boxShadow: "0 12px 35px rgba(15,23,42,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#16a34a",
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  ✓ APP GENERATED
                </div>

                <h2 style={{ margin: 0, fontSize: 30 }}>
                  {result.specification.name}
                </h2>
              </div>

              {result?.preview?.id && (
                <button
                  onClick={() => {
                    window.location.href =
                      `/app/generated/${result.preview.id}`;
                  }}
                  style={{
                    padding: "14px 22px",
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    border: "none",
                    background: "#166534",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Open My App →
                </button>
              )}
            </div>

            <p
              style={{
                color: "#64748b",
                fontSize: 16,
                lineHeight: 1.6,
                marginTop: 18,
              }}
            >
              {result.specification.description}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 18,
                marginTop: 26,
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: "#f8fafc",
                }}
              >
                <strong>Pages</strong>
                <p style={{ color: "#64748b" }}>
                  {result.specification.pages?.length || 0}
                </p>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: "#f8fafc",
                }}
              >
                <strong>Features</strong>
                <p style={{ color: "#64748b" }}>
                  {result.specification.features?.length || 0}
                </p>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: "#f8fafc",
                }}
              >
                <strong>AI Provider</strong>
                <p style={{ color: "#64748b" }}>
                  {result.aiProvider || "AI"}
                </p>
              </div>
            </div>

            <p
              style={{
                marginTop: 24,
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Generation time: {elapsed.toFixed(1)}s
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
