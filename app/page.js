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
      <div className="ambient ambient-forest" />
      <div className="ambient ambient-ocean" />

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

          <div className="builder-box glass-card">

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

        {/* USER GUIDE */}

        <section className="guide glass-card">

          <div className="eyebrow">
            AI APP BUILDER · USER GUIDE
          </div>

          <h2>
            📖 使用说明 / How It Works
          </h2>

          <p className="guide-intro">
            从一个想法开始，AI App Builder
            会带你完成：
            <br />
            Create → Modify → Preview → Test
            → Publish → Rollback
          </p>

          <div className="guide-grid">

            <div className="guide-step">
              <span>01</span>
              <h3>✨ Create</h3>
              <p>
                用自然语言描述你想做的 App。
                越清楚越好，例如功能、用户、
                地区和页面。
              </p>
            </div>

            <div className="guide-step">
              <span>02</span>
              <h3>🛠️ Modify</h3>
              <p>
                告诉 AI 要增加、删除或修改什么，
                逐步完善设计和功能。
              </p>
            </div>

            <div className="guide-step">
              <span>03</span>
              <h3>👀 Preview</h3>
              <p>
                先看 AI 生成的 App Preview，
                确认页面结构、内容和操作流程。
              </p>
            </div>

            <div className="guide-step">
              <span>04</span>
              <h3>🧪 Test</h3>
              <p>
                测试主要按钮、页面和 API。
                发现问题后返回 Modify 再修正。
              </p>
            </div>

            <div className="guide-step">
              <span>05</span>
              <h3>🚀 Publish</h3>
              <p>
                通过安全检查并完成 Human Approval
                后才允许发布。
              </p>
            </div>

            <div className="guide-step">
              <span>06</span>
              <h3>↩️ Rollback</h3>
              <p>
                发布后如果新版本出现问题，
                可以回到之前稳定的版本。
              </p>
            </div>

          </div>

          <div className="guide-note">
            🌲 <strong>Forest + Ocean Design</strong>
            <br />
            森林代表稳定、安全与成长；
            海洋代表开放、连接与无限创造。
          </div>

        </section>

        <footer className="footer">
          AI App Builder · Autonomous AI Engine ·
          Built for creators
        </footer>

      </div>
    </main>
  );
}
