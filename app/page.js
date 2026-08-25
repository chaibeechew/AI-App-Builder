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

        if (next >= steps.length) {
          return current;
        }

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
        body: JSON.stringify({
          idea: value,
        }),
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
        padding: "60px 24px",
        fontFamily: "Arial, sans-serif",
        background: "#f7f7f5",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: 48 }}>AI App Builder</h1>

        <p style={{ fontSize: 20, color: "#666", marginBottom: 32 }}>
          Describe your idea. AI builds your app.
        </p>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Example: Build a real estate CRM..."
          rows={6}
          disabled={loading}
          style={{
            width: "100%",
            padding: 18,
            fontSize: 18,
            borderRadius: 12,
            border: "1px solid #ccc",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={createApp}
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "15px 28px",
            fontSize: 18,
            borderRadius: 10,
            border: "none",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "AI is building..." : "Create App"}
        </button>

        {loading && (
          <section
            style={{
              marginTop: 32,
              padding: 28,
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #ddd",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <strong>🧠 Building your app...</strong>
              <strong>{Math.round(progress)}%</strong>
            </div>

            <div
              style={{
                height: 10,
                background: "#e5e5e5",
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#111",
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            <div style={{ marginTop: 24 }}>
              {steps.map((step, index) => {
                const completed = index < stepIndex;
                const active = index === stepIndex;

                return (
                  <div
                    key={step.label}
                    style={{
                      marginBottom: 12,
                      color: completed || active ? "#111" : "#999",
                    }}
                  >
                    {completed ? "✓" : active ? "●" : "○"}{" "}
                    {step.label}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 20,
                color: "#666",
              }}
            >
              Time elapsed: {elapsed.toFixed(1)}s
            </div>
          </section>
        )}

        {error && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 10,
              background: "#ffe8e8",
            }}
          >
            {error}
          </div>
        )}

        {result?.specification && (
          <section
            style={{
              marginTop: 40,
              padding: 28,
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #ddd",
            }}
          >
            {result?.preview?.id && (
  <button
    onClick={() => {
      window.location.href = `/app/generated/${result.preview.id}`;
    }}
    style={{
      marginTop: 20,
      padding: "14px 24px",
      fontSize: 17,
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
    }}
  >
    Open My App →
  </button>
)}

            <h3>{result.specification.name}</h3>

            <p>{result.specification.description}</p>

            <h3>Pages</h3>

            <ul>
              {result.specification.pages?.map((page) => (
                <li key={page.name}>
                  <strong>{page.name}</strong> — {page.purpose}
                </li>
              ))}
            </ul>

            <h3>Features</h3>

            <ul>
              {result.specification.features?.map((feature) => (
                <li key={feature.name}>
                  <strong>{feature.name}</strong> —{" "}
                  {feature.description}
                </li>
              ))}
            </ul>

            <p style={{ marginTop: 24, color: "#666" }}>
              Generation time: {elapsed.toFixed(1)}s
            </p>

            <p style={{ color: "#666" }}>
              AI used: {result.aiProvider}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
