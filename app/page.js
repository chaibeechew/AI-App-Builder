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
        throw new Error(data.error || "Unable to create app.");
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

      {/* FOREST + OCEAN ATMOSPHERE */}
      <div className="forest-layer" />
      <div className="ocean-layer" />
      <div className="ambient ambient-forest" />
      <div className="ambient ambient-ocean" />

      <div className="container">

        {/* NAVIGATION */}
        <nav className="navbar glass-card">

          <div className="logo">
            🧠 <span>AI App Builder</span>
            <small>Autonomous AI Engine</small>
          </div>

          <div className="nav-links">
            <span>✨ Create</span>
            <span>🛠️ Modify</span>
            <span>🧪 Test</span>
            <span>🚀 Publish</span>
            <span>↩️ Rollback</span>
          </div>

          <div className="status">
            🛡️ Safety Engine ON
          </div>

        </nav>

        {/* HERO */}
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

          {/* AI CORE */}
          <div className="ai-core">
            <div className="ai-core-glow">
              🧠
            </div>
            <div className="energy energy-left">
              🌲
            </div>
            <div className="energy energy-right">
              🌊
            </div>
          </div>

          {/* BUILDER */}
          <div className="builder-box glass-card">

            <div className="builder-heading">
              🌱 Describe Your App Idea
            </div>

            <textarea
              className="builder-input"
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              placeholder="Example: Create a property listing app for Malaysia with search, filters, map view, favorites and contact agent..."
            />

            <div className="builder-actions">

              <div className="builder-tags">
                <span>🌲 Forest</span>
                <span>🌊 Ocean</span>
                <span>🛡️ Safety Enabled</span>
              </div>

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

          </div>

        </section>

        {/* BLOCKED */}
        {result?.blocked && (
          <section className="result">

            <h2>
              🛡️ Creation Blocked
            </h2>

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

        {/* GENERATED APP */}
        {result?.success && preview && (
          <section className="result">

            <div className="preview-header">
              <div>
                <div className="eyebrow">
                  AI GENERATED
                </div>

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
              </div>
            </div>

            <div className="app-preview-card">

              <div className="preview-topbar">
                📱 {homePage?.name || "Home"}
              </div>

              <div className="preview-content">

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
                          className="preview-text"
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

            <div className="security-result">
              🛡️ Security Scan:{" "}
              <strong>
                {preview.safety?.scanned
                  ? "Passed"
                  : "Pending"}
              </strong>
            </div>

            <div className="approval-note">
              Human approval is required before
              publishing.
            </div>

          </section>
        )}

        {/* ERROR */}
        {result &&
          !result.success &&
          !result.blocked && (
            <section className="result">

              <h2 className="result-error">
                ⚠️ Error
              </h2>

              <p>
                {result.error}
              </p>

            </section>
          )}

        {/* WORKFLOW */}
        <section className="workflow">

          <div className="feature">
            <div className="feature-icon">
              🌱
            </div>

            <div className="feature-title">
              ✨ Create
            </div>

            <div className="feature-text">
              Describe your idea in natural language.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              ⚙️
            </div>

            <div className="feature-title">
              🛠️ Modify
            </div>

            <div className="feature-text">
              Tell AI what you want to change.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              🧪
            </div>

            <div className="feature-title">
              🧪 Test
            </div>

            <div className="feature-text">
              Test the app before publishing.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              🛡️
            </div>

            <div className="feature-title">
              🚀 Safe Publish
            </div>

            <div className="feature-text">
              Security scan and human approval.
            </div>
          </div>

        </section>

        {/* HOW IT WORKS */}
        <section className="guide glass-card">

          <div className="eyebrow">
            AI APP BUILDER
          </div>

          <h2>
            🌲🌊 HOW IT WORKS
          </h2>

          <p className="guide-intro">
            从一个想法开始，到真正发布 App。
            <br />
            Create → Modify → Preview → Test
            → Publish → Rollback
          </p>

          <div className="guide-grid">

            <div className="guide-step">
              <span>01</span>
              <h3>✨ Create</h3>
              <p>
                描述你的 App 想法、功能、用户和目标。
              </p>
            </div>

            <div className="guide-step">
              <span>02</span>
              <h3>🌱 Modify</h3>
              <p>
                让 AI 增加、删除或修改功能。
              </p>
            </div>

            <div className="guide-step">
              <span>03</span>
              <h3>👀 Preview</h3>
              <p>
                查看 AI 生成的 App Preview。
              </p>
            </div>

            <div className="guide-step">
              <span>04</span>
              <h3>🧪 Test</h3>
              <p>
                测试页面、按钮、流程和 API。
              </p>
            </div>

            <div className="guide-step">
              <span>05</span>
              <h3>🚀 Publish</h3>
              <p>
                通过安全检查和人工批准后发布。
              </p>
            </div>

            <div className="guide-step">
              <span>06</span>
              <h3>↩️ Rollback</h3>
              <p>
                出现问题时恢复到稳定版本。
              </p>
            </div>

          </div>

          <div className="guide-note">

            🌲 <strong>Forest</strong>
            {" "}代表成长、稳定与安全。

            <br />

            🌊 <strong>Ocean</strong>
            {" "}代表开放、连接与无限创造。

          </div>

        </section>

        {/* FOOTER */}
        <footer className="footer">

          <strong>
            🧠 AI App Builder
          </strong>

          <br />

          Autonomous AI Engine ·
          Built for creators

        </footer>

      </div>
    </main>
  );
}
