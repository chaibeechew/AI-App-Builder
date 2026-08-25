"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function createApp() {
    if (!prompt.trim()) return;

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

        {result && (
          <section className="result">

            {result.blocked ? (
              <>
                <h2>🛡️ Creation Blocked</h2>

                <p className="result-error">
                  {result.reason}
                </p>

                <p>
                  The Safety Engine detected a request
                  that may involve phishing, credential
                  theft, impersonation, or fraud.
                </p>
              </>
            ) : result.success ? (
              <>
                <h2 className="result-success">
                  🚀 App Plan Created
                </h2>

                <p>
                  <strong>Your idea:</strong>
                </p>

                <p>
                  {result.app?.description}
                </p>

                <p>
                  <strong>AI Provider:</strong>{" "}
                  {result.model?.provider}
                </p>

                <p>
                  <strong>Model:</strong>{" "}
                  {result.model?.model}
                </p>

                <h3>Build Pipeline</h3>

                <ul>
                  {result.app?.stages?.map(
                    (stage) => (
                      <li key={stage}>
                        {stage}
                      </li>
                    )
                  )}
                </ul>
              </>
            ) : (
              <>
                <h2 className="result-error">
                  ⚠️ Error
                </h2>

                <p>
                  {result.error}
                </p>
              </>
            )}

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
              Check the app before publishing.
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
              Detect phishing and fraudulent app
              behavior before publication.
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}