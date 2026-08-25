"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function createApp() {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/create-app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to create app."
        );
      }

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const preview = result?.preview;
  const previewApp = preview?.app;
  const homePage = previewApp?.pages?.[0];

  return (
    <main className="app-shell">
      <div className="container">

        <nav className="navbar">
          <div className="logo">
            🧠 AI App Builder
          </div>

          <div className="status">
            🛡️ Safety Engine ON
          </div>
        </nav>

        <section className="hero">

          <div className="eyebrow">
            AUTONOMOUS AI ENGINE · V0.1
          </div>

          <h1>
            Create Any App
            <br />
            <span>With AI</span>
          </h1>

          <p className="hero-description">
            Describe your idea.
            <br />
            AI builds the app.
            <br />
            No coding required.
          </p>

          <div className="builder-box">

            <textarea
              className="builder-input"
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              placeholder="Example: Create a property listing app for Malaysia..."
            />

            <button
              className="create-button"
              onClick={createApp}
              disabled={loading}
            >
              {loading
                ? "🧠 AI is building..."
                : "✨ Create My App"}
            </button>

          </div>
        </section>

        {result?.blocked && (
          <section className="result">
            <h2>🛡️ Creation Blocked</h2>

            <p className="result-error">
              {result.reason}
            </p>

            <p>
              The Safety Engine detected a request
              that may involve phishing, credential
              theft, impersonation, or fraud.
            </p>
          </section>
        )}

        {result?.success && preview && (
          <section className="result">

            <h2 className="result-success">
              🚀 Your App Preview
            </h2>

            <p>
              <strong>
                {previewApp?.name ||
                  "AI Generated App"}
              </strong>
            </p>

            <p>
              {previewApp?.description}
            </p>

            <div
              style={{
                marginTop: "25px",
                padding: "25px",
                border: "1px solid #29493c",
                borderRadius: "18px",
                background: "#07130f",
              }}
            >

              <div
                style={{
                  paddingBottom: "15px",
                  borderBottom:
                    "1px solid #29493c",
                  fontWeight: "800",
                }}
              >
                📱 {homePage?.name || "Home"}
              </div>

              <div style={{ paddingTop: "25px" }}>

                {homePage?.components?.map(
                  (component, index) => {

                    if (
                      component.type === "header"
                    ) {
                      return (
                        <h2 key={index}>
                          {component.title}
                        </h2>
                      );
                    }

                    if (
                      component.type === "content"
                    ) {
                      return (
                        <p
                          key={index}
                          style={{
                            color: "#a8b9b1",
                            lineHeight: "1.6",
                          }}
                        >
                          {component.text}
                        </p>
                      );
                    }

                    if (
                      component.type === "button"
                    ) {
                      return (
                        <button
                          key={index}
                          className="create-button"
                          type="button"
                        >
                          {component.label}
                        </button>
                      );
                    }

                    return null;
                  }
                )}

              </div>
            </div>

            <div
              style={{
                marginTop: "25px",
                padding: "15px",
                borderRadius: "12px",
                background: "#10271e",
              }}
            >
              🛡️ Security Scan:{" "}
              <strong>
                {preview.safety?.scanned
                  ? "Passed"
                  : "Pending"}
              </strong>
            </div>

            <div
              style={{
                marginTop: "15px",
                color: "#a8b9b1",
                fontSize: "14px",
              }}
            >
              Human approval is required before
              publishing.
            </div>

          </section>
        )}

        {result &&
          !result.success &&
          !result.blocked && (
            <section className="result">
              <h2 className="result-error">
                ⚠️ Error
              </h2>

              <p>{result.error}</p>
            </section>
          )}

        <section className="features">

          <div className="feature">
            <div className="feature-icon">
              ✨
            </div>

            <div className="feature-title">
              Create
            </div>

            <div className="feature-text">
              Describe your idea in natural language.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              🛠️
            </div>

            <div className="feature-title">
              Modify
            </div>

            <div className="feature-text">
              Tell AI how you want your app changed.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              🧪
            </div>

            <div className="feature-title">
              Test
            </div>

            <div className="feature-text">
              Test your app before publishing.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              🛡️
            </div>

            <div className="feature-title">
              Safe Publish
            </div>

            <div className="feature-text">
              Detect phishing and fraudulent
              behavior before publication.
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}
