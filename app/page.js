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
  const app = preview?.app;
  const homePage = app?.pages?.[0];

  return (
    <main className="app-shell">

      <div className="forest-layer" />
      <div className="ocean-layer" />
      <div className="ambient ambient-forest" />
      <div className="ambient ambient-ocean" />

      <div className="container">

        {/* NAVBAR */}
        <nav className="navbar glass-card">

          <div className="logo">
            🧠
            <span>
              AI App Builder
              <small>Autonomous AI Engine</small>
            </span>
          </div>

          <div className="nav-links">
            <span>✨ Create</span>
            <span>🛠️ Modify</span>
            <span>👀 Preview</span>
            <span>🧪 Test</span>
            <span>🚀 Publish</span>
            <span>↩️ Rollback</span>
          </div>

          <div className="status">
            🛡️ Safety ON
          </div>

        </nav>

        {/* HERO */}
        <section className="hero">

          <div className="eyebrow">
            AUTONOMOUS AI ENGINE
          </div>

          <h1>
            Create Any App
            <br />
            <span>With AI</span>
          </h1>

          <p className="hero-description">
            🌲 From idea to application.
            <br />
            🌊 Powered by an autonomous AI engine.
            <br />
            🧠 No coding required.
          </p>

          {/* FOREST + OCEAN CORE */}
          <div className="ai-core">

            <div className="energy energy-left">
              🌲
            </div>

            <div className="ai-core-glow">
              🧠
            </div>

            <div className="energy energy-right">
              🌊
            </div>

          </div>

          {/* CREATE AREA */}
          <div className="builder-box glass-card">

            <div className="builder-heading">
              🌱 Describe Your App
            </div>

            <textarea
              className="builder-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a property listing app for Malaysia with search, filters, map view, favorites and contact agent..."
            />

            <div className="builder-actions">

              <div className="builder-tags">
                <span>🌲 Forest</span>
                <span>🌊 Ocean</span>
                <span>🧠 AI Engine</span>
                <span>🛡️ Safety</span>
              </div>

              <button
                className="create-button"
                onClick={createApp}
                disabled={loading}
              >
                {loading
                  ? "🧠 AI Building..."
                  : "✨ Create My App"}
              </button>

            </div>

          </div>

        </section>

        {/* GENERATED APP */}
        {result?.success && preview && (
          <section className="result">

            <div className="eyebrow">
              AI GENERATED APPLICATION
            </div>

            <h2 className="result-success">
              🚀 Your App Preview
            </h2>

            <p>
              <strong>
                {app?.name || "AI Generated App"}
              </strong>
            </p>

            <p>
              {app?.description}
            </p>

            <div className="app-preview-card">

              <div className="preview-topbar">
                📱 {homePage?.name || "Home"}
              </div>

              <div className="preview-content">

                {homePage?.components?.map(
                  (component, index) => {

                    if (component.type === "header") {
                      return (
                        <h2 key={index}>
                          {component.title}
                        </h2>
                      );
                    }

                    if (component.type === "content") {
                      return (
                        <p
                          key={index}
                          className="preview-text"
                        >
                          {component.text}
                        </p>
                      );
                    }

                    if (component.type === "button") {
                      return (
                        <button
                          key={index}
                          className="create-button"
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
              Human approval is required before publishing.
            </div>

          </section>
        )}

        {/* BLOCKED */}
        {result?.blocked && (
          <section className="result">

            <h2 className="result-error">
              🛡️ Creation Blocked
            </h2>

            <p>
              {result.reason}
            </p>

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
            <div className="feature-icon">🌱</div>
            <div className="feature-title">Create</div>
            <div className="feature-text">
              Describe your idea in natural language.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">🌿</div>
            <div className="feature-title">Modify</div>
            <div className="feature-text">
              Ask AI to change or improve your application.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">🌊</div>
            <div className="feature-title">Preview & Test</div>
            <div className="feature-text">
              See your application before publishing.
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">🚀</div>
            <div className="feature-title">Publish</div>
            <div className="feature-text">
              Security scan, approval and deployment.
            </div>
          </div>

        </section>

        {/* USER MANUAL */}
        <section className="guide glass-card">

          <div className="eyebrow">
            USER GUIDE
          </div>

          <h2>
            📖 How It Works
          </h2>

          <p className="guide-intro">
            从一个想法开始，让 Autonomous AI Engine
            帮你完成整个 App 制作流程。
          </p>

          <div className="guide-grid">

            <div className="guide-step">
              <span>01</span>
              <h3>✨ Create</h3>
              <p>
                输入你想制作的 App。
                不需要写代码。
              </p>
            </div>

            <div className="guide-step">
              <span>02</span>
              <h3>🌱 Modify</h3>
              <p>
                告诉 AI 需要增加、
                删除或修改什么。
              </p>
            </div>

            <div className="guide-step">
              <span>03</span>
              <h3>👀 Preview</h3>
              <p>
                查看 AI 自动生成的 App。
              </p>
            </div>

            <div className="guide-step">
              <span>04</span>
              <h3>🧪 Test</h3>
              <p>
                测试功能和使用流程。
              </p>
            </div>

            <div className="guide-step">
              <span>05</span>
              <h3>🛡️ Security</h3>
              <p>
                发布之前进行安全检查。
              </p>
            </div>

            <div className="guide-step">
              <span>06</span>
              <h3>🚀 Publish</h3>
              <p>
                通过检查并确认后发布。
              </p>
            </div>

          </div>

          <div className="guide-note">

            🌲 <strong>Forest</strong>
            {" "}代表成长、创造、稳定。

            <br />

            🌊 <strong>Ocean</strong>
            {" "}代表连接、开放、无限可能。

            <br />

            🧠 <strong>Autonomous AI</strong>
            {" "}负责把你的想法变成真正的 App。

          </div>

        </section>

        {/* FOOTER */}
        <footer className="footer">

          🧠 AI App Builder

          <br />

          Autonomous AI Engine

        </footer>

      </div>

    </main>
  );
}
