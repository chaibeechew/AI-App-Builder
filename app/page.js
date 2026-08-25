"use client";

import { useEffect, useState } from "react";

const themes = [
  { id: "forest", zh: "🌳 森林", en: "🌳 Forest" },
  { id: "ocean", zh: "🌊 大海", en: "🌊 Ocean" },
  { id: "sky", zh: "☁️ 天空", en: "☁️ Sky" },
  { id: "glass", zh: "✨ 毛玻璃", en: "✨ Glass" },
  { id: "dark", zh: "🌌 深空", en: "🌌 Neon" },
  { id: "minimal", zh: "⬜ 极简", en: "⬜ Minimal" },
  { id: "warm", zh: "🏜️ 暖沙", en: "🏜️ Warm" },
];

const translations = {
  en: {
    free: "✦ Free to Generate",
    title1: "Turn Your Ideas",
    title2: "into ",
    title3: "Apps",
    description:
      "Describe your app idea and AI will automatically plan, build, and preview it.",
    placeholder:
      "For example: Build a real estate CRM to manage clients, properties and appointments",
    generate: "✨ Generate App",
    generating: "⏳ Building...",
    preview: "✨ View Preview",
    automated: "Automated Development",
    previewBuild: "Preview as You Build",
    iterate: "Iterate & Improve",
    building: "AI App Builder is building your app",
    start: "🚀 Understanding your idea...",
    steps: [
      "📐 Planning app architecture...",
      "🧩 Creating data models and interface...",
      "⚙️ Writing core application logic...",
      "🎨 Optimizing visual design and interactions...",
      "✅ App build completed! Preview is ready.",
    ],
    done: "🎉 Your app has been generated! Click View Preview.",
    empty: "⚠️ Please describe your app idea first.",
    previewing: "👀 Opening your app preview...",
    language: "中文",
  },

  zh: {
    free: "✦ 免费生成",
    title1: "用 AI 将想法",
    title2: "变成 ",
    title3: "应用",
    description:
      "只需描述您的应用创意，AI 将自动完成规划、开发和预览。",
    placeholder:
      "例如：建立一个管理客户、房产和预约的房地产 CRM",
    generate: "✨ 生成应用",
    generating: "⏳ 生成中...",
    preview: "✨ 查看预览",
    automated: "全自动开发",
    previewBuild: "预览即所得",
    iterate: "支持迭代优化",
    building: "AI App Builder 正在构建您的应用",
    start: "🚀 正在解析您的想法...",
    steps: [
      "📐 正在规划应用架构...",
      "🧩 正在生成数据模型与界面...",
      "⚙️ 正在编写核心应用逻辑...",
      "🎨 正在优化视觉与交互效果...",
      "✅ 应用构建完成！预览已就绪。",
    ],
    done: "🎉 您的应用已生成！点击“查看预览”。",
    empty: "⚠️ 请先描述您的应用创意。",
    previewing: "👀 正在打开应用预览...",
    language: "English",
  },
};

export default function Home() {
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("forest");
  const [idea, setIdea] = useState("");
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);

  const t = translations[language];

  useEffect(() => {
    const savedLanguage =
      localStorage.getItem("ai-app-builder-language");

    const savedTheme =
      localStorage.getItem("ai-app-builder-theme");

    if (savedLanguage === "en" || savedLanguage === "zh") {
      setLanguage(savedLanguage);
    }

    if (themes.some((item) => item.id === savedTheme)) {
      setTheme(savedTheme);
    }

    setIdea(
      savedLanguage === "zh"
        ? "建立一个管理客户、房产和预约的房地产 CRM"
        : "Build a real estate CRM to manage clients, properties and appointments"
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "ai-app-builder-language",
      language
    );

    if (idea === "") {
      setIdea(
        language === "zh"
          ? "建立一个管理客户、房产和预约的房地产 CRM"
          : "Build a real estate CRM to manage clients, properties and appointments"
      );
    }
  }, [language]);

  useEffect(() => {
    localStorage.setItem(
      "ai-app-builder-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    const textarea =
      document.getElementById("appIdea");

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height =
      `${textarea.scrollHeight}px`;
  }, [idea]);

  function switchLanguage() {
    setLanguage(
      language === "en" ? "zh" : "en"
    );

    setStatus("");
    setCompleted(false);
  }

  function handleGenerate() {
    if (generating) return;

    const cleanIdea = idea.trim();

    if (!cleanIdea) {
      setStatus(t.empty);
      return;
    }

    setGenerating(true);
    setCompleted(false);
    setStatus(t.start);

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;

      if (currentStep < t.steps.length) {
        setStatus(t.steps[currentStep]);
      } else {
        clearInterval(interval);

        setGenerating(false);
        setCompleted(true);
        setStatus(t.done);
      }
    }, 700);
  }

  function handlePreview() {
    setStatus(t.previewing);
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleGenerate();
    }
  }

  return (
    <main className={`page theme-${theme}`}>

      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* TOP BAR */}
      <div className="top-bar">

        {/* LANGUAGE */}
        <button
          type="button"
          className="language-switch"
          onClick={switchLanguage}
        >
          {language === "en"
            ? "中文"
            : "English"}
        </button>

      </div>

      {/* THEME SWITCHER */}
      <div className="theme-switcher">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-btn ${
              theme === item.id
                ? "active"
                : ""
            }`}
            onClick={() =>
              setTheme(item.id)
            }
          >
            {language === "en"
              ? item.en
              : item.zh}
          </button>
        ))}
      </div>

      {/* MAIN CARD */}
      <section className="app-card">

        {/* NAVBAR */}
        <div className="navbar">

          <div className="logo">
            <span className="logo-icon">
              🧠
            </span>

            <span>
              AI App Builder
            </span>
          </div>

          <div className="badge">
            {t.free}
          </div>

        </div>

        {/* HERO */}
        <div className="hero">

          <h1>
            {t.title1}
            <br />
            {t.title2}
            <span>
              {t.title3}
            </span>
          </h1>

          <p>
            {t.description}
          </p>

        </div>

        {/* INPUT */}
        <div className="input-group">

          <textarea
            id="appIdea"
            rows={1}
            value={idea}
            onChange={(event) =>
              setIdea(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            disabled={generating}
          />

          <button
            type="button"
            className={`create-btn ${
              generating
                ? "loading"
                : ""
            }`}
            onClick={
              completed
                ? handlePreview
                : handleGenerate
            }
            disabled={generating}
          >
            {generating
              ? t.generating
              : completed
              ? t.preview
              : t.generate}
          </button>

        </div>

        {/* STATUS */}
        <div
          className={`status-tip ${
            status ? "show" : ""
          }`}
        >
          {status}
        </div>

        {/* FEATURES */}
        <div className="features">

          <span>
            <span className="dot" />
            {t.automated}
          </span>

          <span>
            <span className="dot" />
            {t.previewBuild}
          </span>

          <span>
            <span className="dot" />
            {t.iterate}
          </span>

        </div>

        {/* PROGRESS */}
        {generating && (
          <div className="progress-area">

            <div className="progress-track">
              <div className="progress-bar" />
            </div>

            <div className="progress-text">
              {t.building}
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

        /* PAGE */

        .page {
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
            blur(14px)
            saturate(150%);

          --text-primary:
            #1a3a1a;

          --text-secondary:
            #4a6a4a;

          --accent-gradient:
            linear-gradient(
              135deg,
              #2e7d32,
              #66bb6a
            );

          --accent-shadow:
            0 8px 24px
              rgba(46, 125, 50, 0.3);

          --input-bg:
            #f6fcf6;

          --badge-bg:
            rgba(46, 125, 50, 0.12);

          --badge-color:
            #2e7d32;

          --dot-color:
            #43a047;

          position: relative;

          min-height: 100vh;

          width: 100%;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          padding: 90px 24px 40px;

          overflow: hidden;

          color:
            var(--text-primary);

          background:
            var(--body-bg);

          transition:
            background 0.6s ease,
            color 0.4s ease;
        }

        /* TOP BAR */

        .top-bar {
          position: absolute;

          top: 24px;
          right: 24px;

          z-index: 10;
        }

        .language-switch {
          border: 1px solid
            rgba(255,255,255,0.5);

          background:
            rgba(255,255,255,0.5);

          backdrop-filter:
            blur(12px);

          color:
            var(--text-primary);

          padding:
            9px 18px;

          border-radius:
            999px;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;

          transition:
            all 0.25s ease;
        }

        .language-switch:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 8px 20px
              rgba(0,0,0,0.08);
        }

        /* BACKGROUND */

        .background-glow {
          position: absolute;

          width: 500px;
          height: 500px;

          border-radius: 50%;

          pointer-events: none;

          filter:
            blur(100px);

          opacity: 0.3;
        }

        .glow-one {
          top: -250px;
          left: -150px;

          background:
            var(--dot-color);
        }

        .glow-two {
          bottom: -300px;
          right: -150px;

          background:
            var(--dot-color);

          opacity: 0.15;
        }

        /* THEME SWITCHER */

        .theme-switcher {
          position: relative;

          z-index: 5;

          display: flex;

          gap: 10px;

          flex-wrap: wrap;

          justify-content: center;

          margin-bottom: 30px;

          padding:
            14px 24px;

          max-width: 900px;

          border-radius:
            60px;

          background:
            rgba(255,255,255,0.4);

          backdrop-filter:
            blur(12px);

          border:
            1px solid
              rgba(255,255,255,0.45);
        }

        .theme-btn {
          padding:
            8px 17px;

          border-radius:
            40px;

          border:
            2px solid
              transparent;

          background:
            rgba(255,255,255,0.5);

          color:
            #1e293b;

          font-size:
            13px;

          font-weight:
            600;

          cursor:
            pointer;

          white-space:
            nowrap;

          transition:
            all 0.25s ease;
        }

        .theme-btn:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 8px 16px
              rgba(0,0,0,0.06);
        }

        .theme-btn.active {
          border-color:
            var(--dot-color);

          background:
            var(--dot-color);

          color:
            white;

          box-shadow:
            0 8px 20px
              rgba(0,0,0,0.12);
        }

        /* CARD */

        .app-card {
          position: relative;

          z-index: 2;

          width: 100%;

          max-width: 820px;

          padding:
            48px 56px;

          border-radius:
            48px;

          background:
            var(--card-bg);

          backdrop-filter:
            var(--backdrop);

          -webkit-backdrop-filter:
            var(--backdrop);

          border:
            var(--card-border);

          box-shadow:
            var(--card-shadow);
        }

        /* NAVBAR */

        .navbar {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          margin-bottom:
            48px;

          gap: 12px;

          flex-wrap:
            wrap;
        }

        .logo {
          display:
            flex;

          align-items:
            center;

          gap: 12px;

          font-size:
            24px;

          font-weight:
            700;

          color:
            var(--text-primary);
        }

        .logo-icon {
          width:
            44px;

          height:
            44px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border-radius:
            16px;

          background:
            var(--accent-gradient);

          color:
            white;

          font-size:
            26px;

          box-shadow:
            var(--accent-shadow);
        }

        .badge {
          padding:
            6px 18px;

          border-radius:
            40px;

          background:
            var(--badge-bg);

          color:
            var(--badge-color);

          font-size:
            14px;

          font-weight:
            600;
        }

        /* HERO */

        .hero h1 {
          margin:
            0 0 12px;

          color:
            var(--text-primary);

          font-size:
            42px;

          font-weight:
            700;

          line-height:
            1.2;

          letter-spacing:
            -1.2px;
        }

        .hero h1 span {
          background:
            var(--accent-gradient);

          -webkit-background-clip:
            text;

          -webkit-text-fill-color:
            transparent;

          background-clip:
            text;
        }

        .hero p {
          max-width:
            85%;

          margin:
            0 0 32px;

          color:
            var(--text-secondary);

          font-size:
            18px;

          line-height:
            1.6;
        }

        /* INPUT */

        .input-group {
          display:
            flex;

          align-items:
            flex-end;

          gap:
            12px;

          padding:
            8px 8px 8px 28px;

          border-radius:
            32px;

          background:
            var(--input-bg);

          border:
            1px solid
              rgba(0,0,0,0.04);

          box-shadow:
            0 8px 32px
              rgba(0,20,40,0.06);
        }

        .input-group textarea {
          flex:
            1;

          min-height:
            68px;

          max-height:
            160px;

          padding:
            16px 0;

          border:
            none;

          outline:
            none;

          resize:
            vertical;

          background:
            transparent;

          color:
            var(--text-primary);

          font-size:
            16px;

          line-height:
            1.6;
        }

        .input-group textarea::placeholder {
          color:
            #a0b3c8;
        }

        /* BUTTON */

        .create-btn {
          height:
            60px;

          flex-shrink:
            0;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            8px;

          padding:
            16px 36px;

          border:
            none;

          border-radius:
            28px;

          background:
            var(--accent-gradient);

          color:
            white;

          font-size:
            18px;

          font-weight:
            600;

          cursor:
            pointer;

          white-space:
            nowrap;

          box-shadow:
            var(--accent-shadow);

          transition:
            all 0.25s ease;
        }

        .create-btn:hover:not(:disabled) {
          transform:
            scale(1.03)
            translateY(-2px);
        }

        .create-btn:disabled {
          opacity:
            0.8;

          cursor:
            not-allowed;
        }

        /* STATUS */

        .status-tip {
          min-height:
            28px;

          margin-top:
            20px;

          color:
            var(--text-primary);

          font-size:
            14px;

          font-weight:
            500;

          opacity:
            0;

          transform:
            translateY(6px);

          transition:
            all 0.3s ease;
        }

        .status-tip.show {
          opacity:
            1;

          transform:
            translateY(0);
        }

        /* FEATURES */

        .features {
          display:
            flex;

          gap:
            28px;

          flex-wrap:
            wrap;

          margin-top:
            32px;

          color:
            var(--text-secondary);

          font-size:
            14px;

          font-weight:
            500;
        }

        .features span {
          display:
            flex;

          align-items:
            center;

          gap:
            8px;
        }

        .dot {
          width:
            6px;

          height:
            6px;

          border-radius:
            50%;

          background:
            var(--dot-color);
        }

        /* PROGRESS */

        .progress-area {
          margin-top:
            28px;
        }

        .progress-track {
          width:
            100%;

          height:
            6px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            rgba(0,0,0,0.08);
        }

        .progress-bar {
          width:
            45%;

          height:
            100%;

          border-radius:
            inherit;

          background:
            var(--accent-gradient);

          animation:
            progressMove
            1.4s
            ease-in-out
            infinite;
        }

        .progress-text {
          margin-top:
            10px;

          color:
            var(--text-secondary);

          font-size:
            12px;

          text-align:
            center;
        }

        @keyframes progressMove {
          0% {
            transform:
              translateX(-120%);
          }

          100% {
            transform:
              translateX(250%);
          }
        }

        /* OCEAN */

        .theme-ocean {
          --body-bg:
            linear-gradient(
              145deg,
              #071a24,
              #123b4a
            );

          --card-bg:
            rgba(8,28,40,0.85);

          --card-border:
            1px solid
              rgba(0,180,216,0.25);

          --card-shadow:
            0 30px 80px
              rgba(0,0,0,0.7);

          --text-primary:
            #e0f7fa;

          --text-secondary:
            #8ecae6;

          --accent-gradient:
            linear-gradient(
              135deg,
              #0077b6,
              #48cae4
            );

          --accent-shadow:
            0 8px 28px
              rgba(0,119,182,0.35);

          --input-bg:
            rgba(255,255,255,0.06);

          --badge-bg:
            rgba(0,180,216,0.15);

          --badge-color:
            #48cae4;

          --dot-color:
            #00b4d8;
        }

        /* SKY */

        .theme-sky {
          --body-bg:
            linear-gradient(
              145deg,
              #e0f2fe,
              #bae6fd
            );

          --card-bg:
            rgba(255,255,255,0.75);

          --card-border:
            1px solid
              rgba(255,255,255,0.8);

          --card-shadow:
            0 30px 80px
              rgba(0,80,120,0.06);

          --text-primary:
            #0c4a6e;

          --text-secondary:
            #4a7a9c;

          --accent-gradient:
            linear-gradient(
              135deg,
              #0284c7,
              #7dd3fc
            );

          --accent-shadow:
            0 8px 24px
              rgba(2,132,199,0.25);

          --input-bg:
            #f8fcff;

          --badge-bg:
            rgba(2,132,199,0.08);

          --badge-color:
            #0369a1;

          --dot-color:
            #38bdf8;
        }

        /* DARK */

        .theme-dark {
          --body-bg:
            #0b0e14;

          --card-bg:
            rgba(18,25,40,0.85);

          --card-border:
            1px solid
              rgba(0,229,255,0.25);

          --card-shadow:
            0 30px 80px
              rgba(0,0,0,0.8);

          --text-primary:
            #e8f0fe;

          --text-secondary:
            #8aa3c9;

          --accent-gradient:
            linear-gradient(
              135deg,
              #00e5ff,
              #a855f7
            );

          --accent-shadow:
            0 8px 32px
              rgba(0,229,255,0.25);

          --input-bg:
            rgba(255,255,255,0.06);

          --badge-bg:
            rgba(0,229,255,0.12);

          --badge-color:
            #67e8f9;

          --dot-color:
            #00e5ff;
        }

        /* MINIMAL */

        .theme-minimal {
          --body-bg:
            #f8fafc;

          --card-bg:
            #ffffff;

          --card-border:
            1px solid #e9edf2;

          --card-shadow:
            0 20px 60px
              rgba(0,0,0,0.04);

          --text-primary:
            #0f172a;

          --text-secondary:
            #475569;

          --accent-gradient:
            linear-gradient(
              135deg,
              #2563eb,
              #3b82f6
            );

          --accent-shadow:
            0 8px 24px
              rgba(37,99,235,0.2);

          --input-bg:
            #f1f5f9;

          --badge-bg:
            #eef2ff;

          --badge-color:
            #4338ca;

          --dot-color:
            #2563eb;
        }

        /* WARM */

        .theme-warm {
          --body-bg:
            #f7f0e8;

          --card-bg:
            rgba(255,249,240,0.8);

          --card-border:
            1px solid
              rgba(230,200,170,0.4);

          --card-shadow:
            0 30px 80px
              rgba(120,80,50,0.08);

          --text-primary:
            #3d2c1e;

          --text-secondary:
            #7a624a;

          --accent-gradient:
            linear-gradient(
              135deg,
              #e07c3c,
              #f39c6d
            );

          --accent-shadow:
            0 8px 24px
              rgba(224,124,60,0.25);

          --input-bg:
            #fffcf5;

          --badge-bg:
            rgba(224,124,60,0.12);

          --badge-color:
            #b85c2a;

          --dot-color:
            #e07c3c;
        }

        /* MOBILE */

        @media (max-width:700px) {

          .page {
            padding:
              80px 14px 24px;
          }

          .top-bar {
            top:
              16px;

            right:
              16px;
          }

          .theme-switcher {
            width:
              100%;

            padding:
              12px 14px;

            gap:
              7px;

            border-radius:
              30px;
          }

          .theme-btn {
            padding:
              7px 10px;

            font-size:
              11px;
          }

          .app-card {
            padding:
              32px 22px;

            border-radius:
              32px;
          }

          .navbar {
            margin-bottom:
              34px;
          }

          .logo {
            font-size:
              20px;
          }

          .logo-icon {
            width:
              40px;

            height:
              40px;

            font-size:
              23px;
          }

          .hero h1 {
            font-size:
              30px;
          }

          .hero p {
            max-width:
              100%;

            font-size:
              16px;
          }

          .input-group {
            flex-direction:
              column;

            align-items:
              stretch;

            padding:
              18px;

            border-radius:
              24px;
          }

          .input-group textarea {
            min-height:
              90px;

            padding:
              0;
          }

          .create-btn {
            width:
              100%;

            height:
              56px;
          }

          .features {
            gap:
              14px 20px;

            font-size:
              13px;
          }
        }

      `}</style>
    </main>
  );
}
