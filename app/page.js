"use client";

import { useEffect, useState } from "react";

const themes = [
  { id: "glass", label: "✨ 毛玻璃" },
  { id: "dark", label: "🌌 深空霓虹" },
  { id: "minimal", label: "⬜ 极简白" },
  { id: "warm", label: "🏜️ 暖沙大地" },
  { id: "forest", label: "🌳 森林" },
  { id: "ocean", label: "🌊 大海" },
  { id: "sky", label: "☁️ 天空" },
];

const steps = [
  "📐 正在规划应用架构...",
  "🧩 正在生成数据模型与界面...",
  "⚙️ 正在编写核心逻辑代码...",
  "🎨 正在优化视觉与交互效果...",
  "✅ 应用构建完成！预览已就绪。",
];

export default function Home() {
  const [theme, setTheme] = useState("forest");
  const [idea, setIdea] = useState(
    "建立一个管理客户、房产和预约的房地产 CRM"
  );
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("ai-app-builder-theme");

    if (savedTheme && themes.some((item) => item.id === savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ai-app-builder-theme", theme);
  }, [theme]);

  useEffect(() => {
    const textarea = document.getElementById("appIdea");

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [idea]);

  async function handleGenerate() {
    if (generating) return;

    const cleanIdea = idea.trim();

    if (!cleanIdea) {
      setStatus("⚠️ 请先在输入框中描述您的应用创意");
      setCompleted(false);
      return;
    }

    setGenerating(true);
    setCompleted(false);
    setStatus(`🚀 正在解析：“${cleanIdea}” ...`);

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep += 1;

      if (currentStep < steps.length) {
        setStatus(steps[currentStep]);
      } else {
        clearInterval(interval);

        setGenerating(false);
        setCompleted(true);
        setStatus("🎉 您的应用已生成！点击“查看预览”体验。");
      }
    }, 700);
  }

  function handlePreview() {
    setStatus("👀 正在打开应用预览...");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleGenerate();
    }
  }

  return (
    <main className={`page theme-${theme}`}>
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* Theme Switcher */}
      <div className="theme-switcher">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-btn ${
              theme === item.id ? "active" : ""
            }`}
            onClick={() => setTheme(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Card */}
      <section className="app-card">
        {/* Navbar */}
        <div className="navbar">
          <div className="logo">
            <span className="logo-icon">🧠</span>

            <span>AI App Builder</span>
          </div>

          <div className="badge">✦ 免费生成</div>
        </div>

        {/* Hero */}
        <div className="hero">
          <h1>
            用 AI 将想法
            <br />
            变成 <span>应用</span>
          </h1>

          <p>
            只需描述您的应用创意，AI 将自动完成规划、编码和预览。
          </p>
        </div>

        {/* Input */}
        <div className="input-group">
          <textarea
            id="appIdea"
            rows={1}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：建立一个管理客户、房产和预约的房地产 CRM"
            disabled={generating}
          />

          <button
            type="button"
            className={`create-btn ${generating ? "loading" : ""}`}
            onClick={completed ? handlePreview : handleGenerate}
            disabled={generating}
          >
            {generating
              ? "⏳ 生成中..."
              : completed
              ? "✨ 查看预览"
              : "✨ 生成应用"}
          </button>
        </div>

        {/* Status */}
        <div className={`status-tip ${status ? "show" : ""}`}>
          {status}
        </div>

        {/* Features */}
        <div className="features">
          <span>
            <span className="dot" />
            全自动开发
          </span>

          <span>
            <span className="dot" />
            预览即所得
          </span>

          <span>
            <span className="dot" />
            支持迭代优化
          </span>
        </div>

        {/* Generation Progress */}
        {generating && (
          <div className="progress-area">
            <div className="progress-track">
              <div className="progress-bar" />
            </div>

            <div className="progress-text">
              AI App Builder 正在构建您的应用
            </div>
          </div>
        )}
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
        }

        body {
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        textarea {
          font-family: inherit;
        }

        /* =========================================
           ROOT
        ========================================= */

        .page {
          --body-bg: linear-gradient(
            145deg,
            #f6f9fc 0%,
            #e6f0f5 100%
          );

          --card-bg: rgba(255, 255, 255, 0.7);
          --card-border: 1px solid rgba(255, 255, 255, 0.5);

          --card-shadow:
            0 30px 80px rgba(0, 20, 40, 0.12),
            0 10px 30px rgba(0, 0, 0, 0.04);

          --backdrop: blur(16px) saturate(180%);

          --text-primary: #0b1a2a;
          --text-secondary: #4a5b6e;

          --accent-gradient:
            linear-gradient(
              135deg,
              #6c5ce7,
              #a29bfe
            );

          --accent-shadow:
            0 8px 24px rgba(108, 92, 231, 0.3);

          --input-bg: white;

          --badge-bg: rgba(0, 200, 150, 0.15);
          --badge-color: #0a8f7a;

          --dot-color: #6c5ce7;

          position: relative;

          min-height: 100vh;

          width: 100%;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          padding: 40px 24px;

          overflow: hidden;

          color: var(--text-primary);

          background: var(--body-bg);

          transition:
            background 0.6s ease,
            color 0.4s ease;
        }

        /* =========================================
           BACKGROUND EFFECT
        ========================================= */

        .background-glow {
          position: absolute;

          width: 500px;
          height: 500px;

          border-radius: 50%;

          pointer-events: none;

          filter: blur(100px);

          opacity: 0.35;

          transition: all 0.8s ease;
        }

        .glow-one {
          top: -250px;
          left: -150px;
          background: var(--dot-color);
        }

        .glow-two {
          bottom: -300px;
          right: -150px;
          background: var(--dot-color);
          opacity: 0.18;
        }

        /* =========================================
           THEME SWITCHER
        ========================================= */

        .theme-switcher {
          position: relative;
          z-index: 5;

          display: flex;

          gap: 10px;

          flex-wrap: wrap;

          justify-content: center;

          margin-bottom: 30px;

          padding: 14px 24px;

          max-width: 900px;

          border-radius: 60px;

          background: rgba(255, 255, 255, 0.4);

          backdrop-filter: blur(12px);

          -webkit-backdrop-filter: blur(12px);

          border: 1px solid rgba(255, 255, 255, 0.45);

          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .theme-btn {
          padding: 8px 18px;

          border-radius: 40px;

          border: 2px solid transparent;

          background: rgba(255, 255, 255, 0.5);

          color: #1e293b;

          font-size: 13px;

          font-weight: 600;

          cursor: pointer;

          white-space: nowrap;

          transition: all 0.25s ease;

          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.02);
        }

        .theme-btn:hover {
          transform: translateY(-2px);

          box-shadow:
            0 8px 16px rgba(0, 0, 0, 0.06);
        }

        .theme-btn.active {
          border-color: var(--dot-color);

          background: var(--dot-color);

          color: white;

          box-shadow:
            0 8px 20px
              color-mix(
                in srgb,
                var(--dot-color) 30%,
                transparent
              );
        }

        /* =========================================
           MAIN CARD
        ========================================= */

        .app-card {
          position: relative;

          z-index: 2;

          width: 100%;

          max-width: 820px;

          padding: 48px 56px;

          border-radius: 48px;

          background: var(--card-bg);

          backdrop-filter: var(--backdrop);

          -webkit-backdrop-filter: var(--backdrop);

          border: var(--card-border);

          box-shadow: var(--card-shadow);

          transition:
            all 0.6s
              cubic-bezier(
                0.23,
                1,
                0.32,
                1
              );
        }

        /* =========================================
           NAVBAR
        ========================================= */

        .navbar {
          display: flex;

          justify-content: space-between;

          align-items: center;

          margin-bottom: 48px;

          gap: 12px;

          flex-wrap: wrap;
        }

        .logo {
          display: flex;

          align-items: center;

          gap: 12px;

          font-size: 24px;

          font-weight: 700;

          color: var(--text-primary);

          letter-spacing: -0.3px;
        }

        .logo-icon {
          width: 44px;
          height: 44px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 16px;

          background: var(--accent-gradient);

          color: white;

          font-size: 26px;

          box-shadow: var(--accent-shadow);

          transition: all 0.4s ease;
        }

        .badge {
          padding: 6px 18px;

          border-radius: 40px;

          background: var(--badge-bg);

          color: var(--badge-color);

          border: 1px solid
            color-mix(
              in srgb,
              var(--badge-color) 15%,
              transparent
            );

          font-size: 14px;

          font-weight: 600;
        }

        /* =========================================
           HERO
        ========================================= */

        .hero h1 {
          margin: 0 0 12px;

          color: var(--text-primary);

          font-size: 42px;

          font-weight: 700;

          line-height: 1.2;

          letter-spacing: -1.2px;
        }

        .hero h1 span {
          background: var(--accent-gradient);

          -webkit-background-clip: text;

          -webkit-text-fill-color: transparent;

          background-clip: text;
        }

        .hero p {
          max-width: 85%;

          margin: 0 0 32px;

          color: var(--text-secondary);

          font-size: 18px;

          line-height: 1.6;
        }

        /* =========================================
           INPUT
        ========================================= */

        .input-group {
          display: flex;

          align-items: flex-end;

          gap: 12px;

          padding: 8px 8px 8px 28px;

          border-radius: 32px;

          background: var(--input-bg);

          border: 1px solid
            rgba(0, 0, 0, 0.04);

          box-shadow:
            0 8px 32px
              rgba(0, 20, 40, 0.06);

          transition:
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        }

        .input-group:focus-within {
          border-color: var(--dot-color);

          box-shadow:
            0 8px 32px
              color-mix(
                in srgb,
                var(--dot-color) 12%,
                transparent
              );
        }

        .input-group textarea {
          flex: 1;

          min-height: 68px;

          max-height: 160px;

          padding: 16px 0;

          border: none;

          outline: none;

          resize: vertical;

          background: transparent;

          color: var(--text-primary);

          font-size: 16px;

          line-height: 1.6;
        }

        .input-group textarea::placeholder {
          color: #a0b3c8;
        }

        .input-group textarea:disabled {
          opacity: 0.7;

          cursor: not-allowed;
        }

        /* =========================================
           GENERATE BUTTON
        ========================================= */

        .create-btn {
          height: 60px;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          padding: 16px 36px;

          border: none;

          border-radius: 28px;

          background: var(--accent-gradient);

          color: white;

          font-size: 18px;

          font-weight: 600;

          cursor: pointer;

          white-space: nowrap;

          box-shadow: var(--accent-shadow);

          transition:
            all 0.25s
              cubic-bezier(
                0.34,
                1.56,
                0.64,
                1
              );
        }

        .create-btn:hover:not(:disabled) {
          transform:
            scale(1.03)
            translateY(-2px);

          filter: brightness(1.05);
        }

        .create-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .create-btn:disabled {
          cursor: not-allowed;

          opacity: 0.8;
        }

        .create-btn.loading {
          animation: pulse 1.2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.02);
          }
        }

        /* =========================================
           STATUS
        ========================================= */

        .status-tip {
          min-height: 28px;

          margin-top: 20px;

          color: var(--text-primary);

          font-size: 14px;

          font-weight: 500;

          opacity: 0;

          transform: translateY(6px);

          transition: all 0.3s ease;
        }

        .status-tip.show {
          opacity: 1;

          transform: translateY(0);
        }

        /* =========================================
           FEATURES
        ========================================= */

        .features {
          display: flex;

          gap: 28px;

          flex-wrap: wrap;

          margin-top: 32px;

          color: var(--text-secondary);

          font-size: 14px;

          font-weight: 500;
        }

        .features span {
          display: flex;

          align-items: center;

          gap: 8px;
        }

        .features .dot {
          width: 6px;
          height: 6px;

          flex-shrink: 0;

          border-radius: 50%;

          background: var(--dot-color);

          box-shadow:
            0 0 10px
              color-mix(
                in srgb,
                var(--dot-color) 40%,
                transparent
              );
        }

        /* =========================================
           PROGRESS
        ========================================= */

        .progress-area {
          margin-top: 28px;

          animation: fadeIn 0.4s ease;
        }

        .progress-track {
          width: 100%;

          height: 6px;

          overflow: hidden;

          border-radius: 999px;

          background: color-mix(
            in srgb,
            var(--dot-color) 10%,
            transparent
          );
        }

        .progress-bar {
          width: 45%;

          height: 100%;

          border-radius: inherit;

          background: var(--accent-gradient);

          animation: progressMove 1.4s
            ease-in-out infinite;
        }

        .progress-text {
          margin-top: 10px;

          color: var(--text-secondary);

          font-size: 12px;

          text-align: center;
        }

        @keyframes progressMove {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(250%);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;

            transform: translateY(8px);
          }

          to {
            opacity: 1;

            transform: translateY(0);
          }
        }

        /* =========================================
           FOREST
        ========================================= */

        .theme-forest {
          --body-bg:
            linear-gradient(
              145deg,
              #e4efe4,
              #c8ddc8
            );

          --card-bg:
            rgba(240, 250, 240, 0.8);

          --card-border:
            1px solid
              rgba(60, 100, 60, 0.2);

          --card-shadow:
            0 30px 80px
              rgba(30, 60, 30, 0.12);

          --backdrop:
            blur(14px) saturate(150%);

          --text-primary: #1a3a1a;

          --text-secondary: #4a6a4a;

          --accent-gradient:
            linear-gradient(
              135deg,
              #2e7d32,
              #66bb6a
            );

          --accent-shadow:
            0 8px 24px
              rgba(46, 125, 50, 0.3);

          --input-bg: #f6fcf6;

          --badge-bg:
            rgba(46, 125, 50, 0.12);

          --badge-color: #2e7d32;

          --dot-color: #43a047;
        }

        /* =========================================
           OCEAN
        ========================================= */

        .theme-ocean {
          --body-bg:
            linear-gradient(
              145deg,
              #071a24,
              #123b4a
            );

          --card-bg:
            rgba(8, 28, 40, 0.85);

          --card-border:
            1px solid
              rgba(0, 180, 216, 0.25);

          --card-shadow:
            0 30px 80px
              rgba(0, 0, 0, 0.7),
            0 0 60px
              rgba(0, 150, 200, 0.04);

          --backdrop:
            blur(20px) saturate(180%);

          --text-primary: #e0f7fa;

          --text-secondary: #8ecae6;

          --accent-gradient:
            linear-gradient(
              135deg,
              #0077b6,
              #48cae4
            );

          --accent-shadow:
            0 8px 28px
              rgba(0, 119, 182, 0.35);

          --input-bg:
            rgba(255, 255, 255, 0.06);

          --badge-bg:
            rgba(0, 180, 216, 0.15);

          --badge-color: #48cae4;

          --dot-color: #00b4d8;
        }

        .theme-ocean .input-group {
          border-color:
            rgba(0, 180, 216, 0.15);

          background:
            rgba(255, 255, 255, 0.04);
        }

        /* =========================================
           SKY
        ========================================= */

        .theme-sky {
          --body-bg:
            linear-gradient(
              145deg,
              #e0f2fe,
              #bae6fd
            );

          --card-bg:
            rgba(255, 255, 255, 0.75);

          --card-border:
            1px solid
              rgba(255, 255, 255, 0.8);

          --card-shadow:
            0 30px 80px
              rgba(0, 80, 120, 0.06);

          --backdrop:
            blur(16px) saturate(160%);

          --text-primary: #0c4a6e;

          --text-secondary: #4a7a9c;

          --accent-gradient:
            linear-gradient(
              135deg,
              #0284c7,
              #7dd3fc
            );

          --accent-shadow:
            0 8px 24px
              rgba(2, 132, 199, 0.25);

          --input-bg: #f8fcff;

          --badge-bg:
            rgba(2, 132, 199, 0.08);

          --badge-color: #0369a1;

          --dot-color: #38bdf8;
        }

        /* =========================================
           DARK NEON
        ========================================= */

        .theme-dark {
          --body-bg: #0b0e14;

          --card-bg:
            rgba(18, 25, 40, 0.85);

          --card-border:
            1px solid
              rgba(0, 229, 255, 0.25);

          --card-shadow:
            0 30px 80px
              rgba(0, 0, 0, 0.8),
            0 0 60px
              rgba(0, 229, 255, 0.05);

          --backdrop:
            blur(20px) saturate(200%);

          --text-primary: #e8f0fe;

          --text-secondary: #8aa3c9;

          --accent-gradient:
            linear-gradient(
              135deg,
              #00e5ff,
              #a855f7
            );

          --accent-shadow:
            0 8px 32px
              rgba(0, 229, 255, 0.25);

          --input-bg:
            rgba(255, 255, 255, 0.06);

          --badge-bg:
            rgba(0, 229, 255, 0.12);

          --badge-color: #67e8f9;

          --dot-color: #00e5ff;
        }

        .theme-dark .input-group {
          border-color:
            rgba(0, 229, 255, 0.15);

          background:
            rgba(255, 255, 255, 0.04);
        }

        /* =========================================
           MINIMAL
        ========================================= */

        .theme-minimal {
          --body-bg: #f8fafc;

          --card-bg: #ffffff;

          --card-border:
            1px solid #e9edf2;

          --card-shadow:
            0 20px 60px
              rgba(0, 0, 0, 0.04);

          --backdrop: none;

          --text-primary: #0f172a;

          --text-secondary: #475569;

          --accent-gradient:
            linear-gradient(
              135deg,
              #2563eb,
              #3b82f6
            );

          --accent-shadow:
            0 8px 24px
              rgba(37, 99, 235, 0.2);

          --input-bg: #f1f5f9;

          --badge-bg: #eef2ff;

          --badge-color: #4338ca;

          --dot-color: #2563eb;
        }

        /* =========================================
           WARM
        ========================================= */

        .theme-warm {
          --body-bg: #f7f0e8;

          --card-bg:
            rgba(255, 249, 240, 0.8);

          --card-border:
            1px solid
              rgba(230, 200, 170, 0.4);

          --card-shadow:
            0 30px 80px
              rgba(120, 80, 50, 0.08);

          --backdrop: blur(12px);

          --text-primary: #3d2c1e;

          --text-secondary: #7a624a;

          --accent-gradient:
            linear-gradient(
              135deg,
              #e07c3c,
              #f39c6d
            );

          --accent-shadow:
            0 8px 24px
              rgba(224, 124, 60, 0.25);

          --input-bg: #fffcf5;

          --badge-bg:
            rgba(224, 124, 60, 0.12);

          --badge-color: #b85c2a;

          --dot-color: #e07c3c;
        }

        /* =========================================
           MOBILE
        ========================================= */

        @media (max-width: 700px) {
          .page {
            padding: 24px 14px;
          }

          .theme-switcher {
            width: 100%;

            padding: 12px 14px;

            border-radius: 30px;

            gap: 7px;
          }

          .theme-btn {
            padding: 7px 11px;

            font-size: 11px;
          }

          .app-card {
            padding: 32px 22px;

            border-radius: 32px;
          }

          .navbar {
            margin-bottom: 34px;
          }

          .logo {
            font-size: 20px;
          }

          .logo-icon {
            width: 40px;
            height: 40px;

            font-size: 23px;
          }

          .badge {
            font-size: 12px;

            padding: 5px 12px;
          }

          .hero h1 {
            font-size: 30px;

            letter-spacing: -0.7px;
          }

          .hero p {
            max-width: 100%;

            font-size: 16px;
          }

          .input-group {
            flex-direction: column;

            align-items: stretch;

            padding: 18px;

            gap: 14px;

            border-radius: 24px;
          }

          .input-group textarea {
            min-height: 90px;

            padding: 0;
          }

          .create-btn {
            width: 100%;

            height: 56px;

            font-size: 17px;
          }

          .features {
            gap: 14px 20px;

            margin-top: 26px;

            font-size: 13px;
          }

          .status-tip {
            font-size: 13px;
          }
        }

        @media (max-width: 420px) {
          .theme-switcher {
            justify-content: flex-start;
          }

          .theme-btn {
            font-size: 10px;

            padding: 6px 9px;
          }

          .navbar {
            align-items: flex-start;

            flex-direction: column;
          }

          .hero h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  );
}
