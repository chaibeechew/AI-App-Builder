"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("forest");
  const [idea, setIdea] = useState("");

  const isZh = language === "zh";

  const themes = [
    ["forest", "🌿", isZh ? "森林" : "Forest"],
    ["ocean", "🌊", isZh ? "大海" : "Ocean"],
    ["sky", "☁️", isZh ? "天空" : "Sky"],
    ["glass", "✦", isZh ? "毛玻璃" : "Glass"],
    ["dark", "◈", isZh ? "深空" : "Neon"],
    ["minimal", "○", isZh ? "极简" : "Minimal"],
    ["warm", "◒", isZh ? "暖沙" : "Warm"],
  ];

  useEffect(() => {
    const savedLanguage = localStorage.getItem(
      "aibuilder-language"
    );

    const savedTheme = localStorage.getItem(
      "aibuilder-theme"
    );

    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "aibuilder-language",
      language
    );
  }, [language]);

  useEffect(() => {
    localStorage.setItem(
      "aibuilder-theme",
      theme
    );
  }, [theme]);

  const examples = isZh
    ? [
        "建立一个房地产 CRM，管理客户、房产和预约",
        "建立一个餐厅点餐和会员系统",
        "建立一个预约美容院服务的 App",
      ]
    : [
        "Build a real estate CRM to manage clients, properties and appointments",
        "Build a restaurant ordering and membership app",
        "Build a beauty salon booking app",
      ];

  return (
    <main className={`page theme-${theme}`}>

      {/* Ambient background */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grid-overlay" />

      {/* Top navigation */}
      <nav className="top-nav">

        <div className="brand">
          <div className="brand-mark">
            ✦
          </div>

          <div>
            <div className="brand-name">
              AI App Builder
            </div>

            <div className="brand-caption">
              {isZh
                ? "把想法变成应用"
                : "Ideas into Apps"}
            </div>
          </div>
        </div>

        <button
          className="language-button"
          onClick={() =>
            setLanguage(
              isZh ? "en" : "zh"
            )
          }
        >
          {isZh
            ? "English"
            : "中文"}
          <span>↗</span>
        </button>

      </nav>

      {/* Theme selector */}
      <div className="theme-panel">

        {themes.map(
          ([id, icon, label]) => (
            <button
              key={id}
              className={`theme-button ${
                theme === id
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                setTheme(id);
                localStorage.setItem(
                  "aibuilder-theme",
                  id
                );
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          )
        )}

      </div>

      {/* Hero */}
      <section className="hero">

        <div className="eyebrow">
          <span className="pulse" />

          {isZh
            ? "AI 驱动的新一代 App Builder"
            : "THE NEXT GENERATION AI APP BUILDER"}
        </div>

        <h1>
          {isZh ? (
            <>
              你的想法。
              <br />
              <span>真正的 App。</span>
            </>
          ) : (
            <>
              Your idea.
              <br />
              <span>A real app.</span>
            </>
          )}
        </h1>

        <p className="hero-description">
          {isZh
            ? "告诉 AI 你想做什么。它会理解你的需求、规划功能、设计界面，并帮助你把想法变成真正可以使用的应用。"
            : "Tell AI what you want to build. It understands your idea, plans the features, designs the experience, and turns it into a real application."}
        </p>

        {/* Main builder */}
        <div className="builder-card">

          <div className="builder-top">

            <div className="ai-orb">
              <div className="orb-core">
                ✦
              </div>
            </div>

            <div>
              <div className="builder-title">
                {isZh
                  ? "你想做什么 App？"
                  : "What do you want to build?"}
              </div>

              <div className="builder-subtitle">
                {isZh
                  ? "用自己的话告诉 AI，不需要懂编程。"
                  : "Describe it naturally. No coding required."}
              </div>
            </div>

          </div>

          <textarea
            value={idea}
            onChange={(e) =>
              setIdea(e.target.value)
            }
            placeholder={
              isZh
                ? "例如：我想建立一个房地产 App，可以管理客户、房产、预约和跟进……"
                : "For example: I want to build a real estate app that manages clients, properties, appointments and follow-ups..."
            }
          />

          <div className="builder-footer">

            <div className="secure-note">
              <span>✦</span>

              {isZh
                ? "AI 会帮你整理需求"
                : "AI will structure your idea"}
            </div>

            <button
              className="generate-button"
              onClick={() => {
                document
                  .getElementById(
                    "examples"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
            >
              {isZh
                ? "✨ 开始创建"
                : "✨ Start Building"}

              <span>→</span>
            </button>

          </div>

        </div>

        {/* Examples */}
        <div
          className="examples"
          id="examples"
        >

          <div className="examples-title">
            {isZh
              ? "不知道怎么开始？试试这些"
              : "Not sure where to start? Try an example"}
          </div>

          <div className="example-list">

            {examples.map(
              (example, index) => (
                <button
                  key={index}
                  className="example-card"
                  onClick={() =>
                    setIdea(example)
                  }
                >
                  <span className="example-icon">
                    {index === 0
                      ? "🏠"
                      : index === 1
                      ? "🍽️"
                      : "📅"}
                  </span>

                  <span>
                    {example}
                  </span>

                  <span className="example-arrow">
                    →
                  </span>
                </button>
              )
            )}

          </div>

        </div>

      </section>

      {/* AI flow */}
      <section className="flow-section">

        <div className="flow-heading">
          <span>
            {isZh
              ? "从想法到应用"
              : "FROM IDEA TO APP"}
          </span>

          <h2>
            {isZh
              ? "AI 负责复杂的部分。"
              : "AI handles the complexity."}
          </h2>
        </div>

        <div className="flow">

          {[
            ["01", "✦", isZh ? "理解" : "Understand"],
            ["02", "◇", isZh ? "规划" : "Plan"],
            ["03", "◈", isZh ? "设计" : "Design"],
            ["04", "⚡", isZh ? "构建" : "Build"],
            ["05", "✓", isZh ? "测试" : "Test"],
            ["06", "↗", isZh ? "发布" : "Launch"],
          ].map(
            ([number, icon, label]) => (
              <div
                className="flow-item"
                key={number}
              >
                <div className="flow-number">
                  {number}
                </div>

                <div className="flow-icon">
                  {icon}
                </div>

                <div className="flow-label">
                  {label}
                </div>
              </div>
            )
          )}

        </div>

      </section>

      <footer>
        © 2026 AI App Builder
      </footer>

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
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        textarea {
          font: inherit;
        }

        /* --------------------------------
           CORE
        -------------------------------- */

        .page {
          --bg:
            #e8f1e9;

          --card:
            rgba(255,255,255,.66);

          --card-strong:
            rgba(255,255,255,.82);

          --border:
            rgba(255,255,255,.75);

          --text:
            #102417;

          --muted:
            #627467;

          --accent:
            #2e7d52;

          --accent-light:
            #73c89a;

          --glow:
            rgba(71,170,111,.25);

          position: relative;

          min-height: 100vh;

          overflow: hidden;

          color: var(--text);

          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(255,255,255,.85),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 80%,
              var(--glow),
              transparent 32%
            ),
            var(--bg);

          transition:
            background .7s ease,
            color .5s ease;
        }

        /* --------------------------------
           AMBIENT
        -------------------------------- */

        .ambient {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          filter: blur(100px);

          pointer-events: none;

          opacity: .28;

          animation:
            float 12s ease-in-out infinite;
        }

        .ambient-one {
          top: -260px;
          left: -160px;

          background:
            var(--accent-light);
        }

        .ambient-two {
          right: -260px;
          bottom: -220px;

          background:
            var(--accent);

          animation-delay:
            -5s;
        }

        @keyframes float {

          0%,100% {
            transform:
              translate3d(0,0,0)
              scale(1);
          }

          50% {
            transform:
              translate3d(25px,-20px,0)
              scale(1.06);
          }

        }

        .grid-overlay {
          position: absolute;

          inset: 0;

          pointer-events: none;

          opacity: .035;

          background-image:
            linear-gradient(
              rgba(0,0,0,.6) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(0,0,0,.6) 1px,
              transparent 1px
            );

          background-size:
            42px 42px;
        }

        /* --------------------------------
           NAV
        -------------------------------- */

        .top-nav {
          position: relative;

          z-index: 5;

          max-width: 1180px;

          margin: 0 auto;

          padding:
            28px 28px 0;

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;
        }

        .brand {
          display:
            flex;

          align-items:
            center;

          gap: 12px;
        }

        .brand-mark {
          width: 42px;
          height: 42px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border-radius: 14px;

          color: white;

          background:
            linear-gradient(
              135deg,
              var(--accent),
              var(--accent-light)
            );

          box-shadow:
            0 12px 30px
            var(--glow);
        }

        .brand-name {
          font-size: 16px;

          font-weight: 750;

          letter-spacing:
            -.3px;
        }

        .brand-caption {
          margin-top: 2px;

          font-size: 10px;

          color: var(--muted);

          letter-spacing:
            .8px;

          text-transform:
            uppercase;
        }

        .language-button {
          border:
            1px solid var(--border);

          background:
            rgba(255,255,255,.45);

          backdrop-filter:
            blur(16px);

          color:
            var(--text);

          padding:
            10px 15px;

          border-radius:
            999px;

          cursor:
            pointer;

          font-size:
            13px;

          font-weight:
            650;

          transition:
            .25s ease;
        }

        .language-button:hover {
          transform:
            translateY(-2px);

          background:
            rgba(255,255,255,.7);
        }

        /* --------------------------------
           THEME
        -------------------------------- */

        .theme-panel {
          position:
            relative;

          z-index:
            5;

          display:
            flex;

          justify-content:
            center;

          flex-wrap:
            wrap;

          gap:
            7px;

          max-width:
            1000px;

          margin:
            28px auto 0;

          padding:
            8px;

          border:
            1px solid var(--border);

          border-radius:
            999px;

          background:
            rgba(255,255,255,.38);

          backdrop-filter:
            blur(18px);

          box-shadow:
            0 10px 40px
            rgba(20,60,40,.05);
        }

        .theme-button {
          border:
            0;

          background:
            transparent;

          color:
            var(--muted);

          padding:
            8px 13px;

          border-radius:
            999px;

          cursor:
            pointer;

          font-size:
            12px;

          transition:
            .25s ease;
        }

        .theme-button:hover {
          color:
            var(--text);

          background:
            rgba(255,255,255,.55);
        }

        .theme-button.selected {
          color:
            white;

          background:
            var(--accent);

          box-shadow:
            0 6px 18px
            var(--glow);
        }

        /* --------------------------------
           HERO
        -------------------------------- */

        .hero {
          position:
            relative;

          z-index:
            2;

          max-width:
            900px;

          margin:
            92px auto 0;

          padding:
            0 24px;

          text-align:
            center;
        }

        .eyebrow {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            8px;

          padding:
            7px 13px;

          border:
            1px solid var(--border);

          border-radius:
            999px;

          background:
            rgba(255,255,255,.45);

          backdrop-filter:
            blur(12px);

          color:
            var(--accent);

          font-size:
            11px;

          font-weight:
            750;

          letter-spacing:
            1px;
        }

        .pulse {
          width:
            7px;

          height:
            7px;

          border-radius:
            50%;

          background:
            var(--accent-light);

          box-shadow:
            0 0 0 5px
            rgba(100,190,135,.12);
        }

        .hero h1 {
          margin:
            24px 0 20px;

          font-size:
            clamp(56px,8vw,92px);

          line-height:
            .95;

          letter-spacing:
            -5px;

          font-weight:
            780;
        }

        .hero h1 span {
          background:
            linear-gradient(
              110deg,
              var(--accent),
              var(--accent-light)
            );

          -webkit-background-clip:
            text;

          -webkit-text-fill-color:
            transparent;

          background-clip:
            text;
        }

        .hero-description {
          max-width:
            680px;

          margin:
            0 auto 44px;

          color:
            var(--muted);

          font-size:
            17px;

          line-height:
            1.7;
        }

        /* --------------------------------
           BUILDER
        -------------------------------- */

        .builder-card {
          text-align:
            left;

          padding:
            24px;

          border:
            1px solid var(--border);

          border-radius:
            28px;

          background:
            var(--card);

          backdrop-filter:
            blur(28px)
            saturate(150%);

          box-shadow:
            0 35px 100px
            rgba(20,70,40,.13),
            inset 0 1px 0
            rgba(255,255,255,.8);
        }

        .builder-top {
          display:
            flex;

          align-items:
            center;

          gap:
            13px;

          margin-bottom:
            20px;
        }

        .ai-orb {
          width:
            42px;

          height:
            42px;

          border-radius:
            14px;

          padding:
            1px;

          background:
            linear-gradient(
              135deg,
              var(--accent),
              var(--accent-light)
            );

          box-shadow:
            0 8px 28px
            var(--glow);
        }

        .orb-core {
          width:
            100%;

          height:
            100%;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border-radius:
            13px;

          background:
            rgba(255,255,255,.85);

          color:
            var(--accent);
        }

        .builder-title {
          font-size:
            16px;

          font-weight:
            750;
        }

        .builder-subtitle {
          margin-top:
            3px;

          color:
            var(--muted);

          font-size:
            12px;
        }

        .builder-card textarea {
          display:
            block;

          width:
            100%;

          min-height:
            130px;

          resize:
            vertical;

          border:
            0;

          outline:
            0;

          padding:
            18px;

          border-radius:
            20px;

          background:
            rgba(255,255,255,.55);

          color:
            var(--text);

          font-size:
            16px;

          line-height:
            1.65;

          box-shadow:
            inset 0 0 0 1px
            rgba(0,0,0,.04);

          transition:
            .25s ease;
        }

        .builder-card textarea:focus {
          background:
            rgba(255,255,255,.75);

          box-shadow:
            inset 0 0 0 2px
            var(--accent);
        }

        .builder-card textarea::placeholder {
          color:
            #91a29a;
        }

        .builder-footer {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          gap:
            15px;

          margin-top:
            14px;
        }

        .secure-note {
          color:
            var(--muted);

          font-size:
            11px;
        }

        .secure-note span {
          color:
            var(--accent);
        }

        .generate-button {
          display:
            flex;

          align-items:
            center;

          gap:
            10px;

          border:
            0;

          padding:
            13px 19px;

          border-radius:
            14px;

          background:
            linear-gradient(
              135deg,
              var(--accent),
              var(--accent-light)
            );

          color:
            white;

          font-size:
            13px;

          font-weight:
            750;

          cursor:
            pointer;

          box-shadow:
            0 12px 30px
            var(--glow);

          transition:
            .25s ease;
        }

        .generate-button:hover {
          transform:
            translateY(-2px)
            scale(1.015);

          box-shadow:
            0 16px 35px
            var(--glow);
        }

        /* --------------------------------
           EXAMPLES
        -------------------------------- */

        .examples {
          margin-top:
            32px;

          text-align:
            left;
        }

        .examples-title {
          margin-bottom:
            12px;

          color:
            var(--muted);

          font-size:
            11px;

          font-weight:
            700;

          letter-spacing:
            .7px;
        }

        .example-list {
          display:
            grid;

          gap:
            9px;
        }

        .example-card {
          width:
            100%;

          display:
            grid;

          grid-template-columns:
            34px 1fr 20px;

          align-items:
            center;

          gap:
            10px;

          padding:
            12px;

          border:
            1px solid
            rgba(255,255,255,.55);

          border-radius:
            15px;

          background:
            rgba(255,255,255,.34);

          color:
            var(--text);

          text-align:
            left;

          cursor:
            pointer;

          font-size:
            12px;

          transition:
            .25s ease;
        }

        .example-card:hover {
          transform:
            translateX(4px);

          background:
            rgba(255,255,255,.62);

          border-color:
            var(--accent-light);
        }

        .example-icon {
          width:
            34px;

          height:
            34px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border-radius:
            11px;

          background:
            rgba(255,255,255,.55);

          font-size:
            16px;
        }

        .example-arrow {
          color:
            var(--accent);

          text-align:
            right;
        }

        /* --------------------------------
           FLOW
        -------------------------------- */

        .flow-section {
          position:
            relative;

          z-index:
            2;

          max-width:
            1000px;

          margin:
            130px auto 0;

          padding:
            0 24px 100px;

          text-align:
            center;
        }

        .flow-heading span {
          color:
            var(--accent);

          font-size:
            10px;

          font-weight:
            800;

          letter-spacing:
            2px;
        }

        .flow-heading h2 {
          margin:
            12px 0 50px;

          font-size:
            34px;

          letter-spacing:
            -1.5px;
        }

        .flow {
          display:
            grid;

          grid-template-columns:
            repeat(6,1fr);

          gap:
            10px;
        }

        .flow-item {
          position:
            relative;

          padding:
            20px 8px;

          border:
            1px solid var(--border);

          border-radius:
            20px;

          background:
            rgba(255,255,255,.28);

          backdrop-filter:
            blur(14px);
        }

        .flow-number {
          color:
            var(--muted);

          font-size:
            9px;
        }

        .flow-icon {
          margin:
            13px 0 10px;

          color:
            var(--accent);

          font-size:
            20px;
        }

        .flow-label {
          font-size:
            11px;

          font-weight:
            700;
        }

        footer {
          position:
            relative;

          z-index:
            2;

          padding:
            0 20px 30px;

          text-align:
            center;

          color:
            var(--muted);

          font-size:
            10px;
        }

        /* --------------------------------
           OCEAN
        -------------------------------- */

        .theme-ocean {
          --bg:
            #071c26;

          --card:
            rgba(8,30,40,.62);

          --card-strong:
            rgba(10,40,55,.75);

          --border:
            rgba(100,220,245,.18);

          --text:
            #e7fbff;

          --muted:
            #8fb9c7;

          --accent:
            #08a7d5;

          --accent-light:
            #65e4f5;

          --glow:
            rgba(0,190,230,.25);
        }

        .theme-ocean .grid-overlay {
          opacity:
            .06;
        }

        /* --------------------------------
           SKY
        -------------------------------- */

        .theme-sky {
          --bg:
            #dff3ff;

          --card:
            rgba(255,255,255,.58);

          --border:
            rgba(255,255,255,.85);

          --text:
            #0b4566;

          --muted:
            #57809a;

          --accent:
            #087db8;

          --accent-light:
            #7dd8ff;

          --glow:
            rgba(70,170,220,.2);
        }

        /* --------------------------------
           GLASS
        -------------------------------- */

        .theme-glass {
          --bg:
            linear-gradient(
              135deg,
              #eef3ff,
              #e6eaff
            );

          --card:
            rgba(255,255,255,.58);

          --border:
            rgba(255,255,255,.8);

          --text:
            #172033;

          --muted:
            #68748a;

          --accent:
            #6c5ce7;

          --accent-light:
            #a99cff;

          --glow:
            rgba(108,92,231,.22);
        }

        /* --------------------------------
           DARK
        -------------------------------- */

        .theme-dark {
          --bg:
            #080b12;

          --card:
            rgba(17,22,34,.66);

          --border:
            rgba(100,220,255,.14);

          --text:
            #eef6ff;

          --muted:
            #8496b2;

          --accent:
            #00d9ff;

          --accent-light:
            #a855f7;

          --glow:
            rgba(0,220,255,.2);
        }

        /* --------------------------------
           MINIMAL
        -------------------------------- */

        .theme-minimal {
          --bg:
            #f7f8fa;

          --card:
            rgba(255,255,255,.9);

          --border:
            #e7eaf0;

          --text:
            #111827;

          --muted:
            #64748b;

          --accent:
            #2563eb;

          --accent-light:
            #60a5fa;

          --glow:
            rgba(37,99,235,.14);
        }

        /* --------------------------------
           WARM
        -------------------------------- */

        .theme-warm {
          --bg:
            #f5eee5;

          --card:
            rgba(255,250,242,.66);

          --border:
            rgba(255,255,255,.8);

          --text:
            #402d20;

          --muted:
            #806c5a;

          --accent:
            #c66b32;

          --accent-light:
            #f0aa74;

          --glow:
            rgba(210,120,60,.2);
        }

        /* --------------------------------
           MOBILE
        -------------------------------- */

        @media (max-width: 700px) {

          .top-nav {
            padding:
              18px 16px 0;
          }

          .theme-panel {
            margin:
              20px 14px 0;

            border-radius:
              22px;
          }

          .theme-button {
            padding:
              7px 9px;

            font-size:
              10px;
          }

          .hero {
            margin-top:
              65px;

            padding:
              0 15px;
          }

          .hero h1 {
            font-size:
              55px;

            letter-spacing:
              -3px;
          }

          .hero-description {
            font-size:
              15px;

            line-height:
              1.65;
          }

          .builder-card {
            padding:
              16px;

            border-radius:
              22px;
          }

          .builder-footer {
            align-items:
              stretch;

            flex-direction:
              column;
          }

          .generate-button {
            width:
              100%;

            justify-content:
              center;
          }

          .flow {
            grid-template-columns:
              repeat(2,1fr);
          }

          .flow-heading h2 {
            font-size:
              28px;
          }

        }

      `}</style>

    </main>
  );
}
