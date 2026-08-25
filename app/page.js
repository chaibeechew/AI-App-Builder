"use client";

import { useState } from "react";

export default function Home() {
  const [language, setLanguage] = useState("en");
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  const zh = language === "zh";

  const examples = zh
    ? [
        "建立一个房地产 CRM，管理客户、房产、预约和跟进",
        "建立一个餐厅点餐和会员系统",
        "建立一个美容院预约 App",
      ]
    : [
        "Build a real estate CRM to manage clients, properties, appointments and follow-ups",
        "Build a restaurant ordering and membership app",
        "Build a beauty salon booking app",
      ];

  async function generateApp() {
    const value = idea.trim();

    if (!value || loading) return;

    setLoading(true);
    setError("");
    setPlan(null);

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
        throw new Error(
          data?.error ||
            (zh
              ? "AI 生成失败，请稍后再试。"
              : "AI generation failed. Please try again.")
        );
      }

      setPlan(data.specification);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          (zh
            ? "发生错误，请稍后再试。"
            : "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">

      <div className="glow glow-one" />
      <div className="glow glow-two" />

      {/* NAV */}
      <nav className="nav">

        <div className="brand">
          <div className="brand-icon">✦</div>

          <div>
            <div className="brand-title">
              AI App Builder
            </div>

            <div className="brand-subtitle">
              {zh
                ? "把想法变成应用"
                : "Ideas into Apps"}
            </div>
          </div>
        </div>

        <button
          className="language"
          onClick={() =>
            setLanguage(
              zh ? "en" : "zh"
            )
          }
        >
          {zh ? "English" : "中文"} ↗
        </button>

      </nav>

      {/* HERO */}
      {!plan && (
        <section className="hero">

          <div className="pill">
            <span className="dot" />
            {zh
              ? "AI 驱动的新一代 App Builder"
              : "THE NEXT GENERATION AI APP BUILDER"}
          </div>

          <h1>
            {zh ? (
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

          <p className="description">
            {zh
              ? "告诉 AI 你想做什么。不需要懂编程，AI 会帮你规划功能、设计结构，并生成应用。"
              : "Tell AI what you want to build. No coding required. AI plans the features, structure and experience for you."}
          </p>

          {/* BUILDER */}
          <div className="builder">

            <div className="builder-heading">

              <div className="ai-icon">
                ✦
              </div>

              <div>
                <strong>
                  {zh
                    ? "你想做什么 App？"
                    : "What do you want to build?"}
                </strong>

                <small>
                  {zh
                    ? "用自己的话描述即可"
                    : "Describe it naturally"}
                </small>
              </div>

            </div>

            <textarea
              value={idea}
              onChange={(e) =>
                setIdea(e.target.value)
              }
              placeholder={
                zh
                  ? "例如：我想建立一个房地产 App，可以管理客户、房产、预约和跟进……"
                  : "For example: I want to build a real estate app for managing clients, properties, appointments and follow-ups..."
              }
            />

            {error && (
              <div className="error">
                ⚠️ {error}
              </div>
            )}

            <div className="builder-bottom">

              <span className="hint">
                ✦{" "}
                {zh
                  ? "AI 会自动理解你的需求"
                  : "AI will understand your idea"}
              </span>

              <button
                className="generate"
                onClick={generateApp}
                disabled={loading}
              >
                {loading
                  ? zh
                    ? "AI 分析中..."
                    : "AI is thinking..."
                  : zh
                  ? "✨ AI 生成"
                  : "✨ Generate with AI"}

                <span>
                  {loading ? "◌" : "→"}
                </span>
              </button>

            </div>

          </div>

          {/* EXAMPLES */}
          <div className="examples">

            <div className="examples-title">
              {zh
                ? "不知道怎么开始？试试例子"
                : "Need inspiration? Try an example"}
            </div>

            {examples.map(
              (example, index) => (
                <button
                  className="example"
                  key={example}
                  onClick={() =>
                    setIdea(example)
                  }
                >
                  <span>
                    {index === 0
                      ? "🏠"
                      : index === 1
                      ? "🍽️"
                      : "📅"}
                  </span>

                  <div>
                    {example}
                  </div>

                  <b>→</b>
                </button>
              )
            )}

          </div>

        </section>
      )}

      {/* LOADING */}
      {loading && !plan && (
        <section className="loading-card">

          <div className="loading-orb">
            ✦
          </div>

          <h2>
            {zh
              ? "AI 正在理解你的想法"
              : "AI is understanding your idea"}
          </h2>

          <p>
            {zh
              ? "正在规划应用结构、功能和数据……"
              : "Planning your app structure, features and data..."}
          </p>

          <div className="loader">
            <span />
          </div>

        </section>
      )}

      {/* PLAN */}
      {plan && (
        <section className="plan-section">

          <button
            className="back"
            onClick={() => {
              setPlan(null);
              setError("");
            }}
          >
            ←{" "}
            {zh
              ? "修改想法"
              : "Modify idea"}
          </button>

          <div className="plan-header">

            <div className="success">
              ✓{" "}
              {zh
                ? "AI 已完成规划"
                : "AI planning complete"}
            </div>

            <h1>
              {plan.name}
            </h1>

            <p>
              {plan.description}
            </p>

          </div>

          {/* PAGES */}
          <div className="section-card">

            <h3>
              📱{" "}
              {zh
                ? "应用页面"
                : "App Pages"}
            </h3>

            <div className="items">

              {(plan.pages || []).map(
                (page, index) => (
                  <div
                    className="item"
                    key={index}
                  >
                    <div className="item-icon">
                      {index + 1}
                    </div>

                    <div>
                      <strong>
                        {page.name}
                      </strong>

                      <p>
                        {page.purpose}
                      </p>
                    </div>
                  </div>
                )
              )}

            </div>

          </div>

          {/* FEATURES */}
          <div className="section-card">

            <h3>
              ⚡{" "}
              {zh
                ? "核心功能"
                : "Core Features"}
            </h3>

            <div className="items">

              {(plan.features || []).map(
                (feature, index) => (
                  <div
                    className="item"
                    key={index}
                  >
                    <div className="check">
                      ✓
                    </div>

                    <div>
                      <strong>
                        {feature.name}
                      </strong>

                      <p>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                )
              )}

            </div>

          </div>

          {/* DATA */}
          <div className="section-card">

            <h3>
              🗂️{" "}
              {zh
                ? "数据结构"
                : "Data Structure"}
            </h3>

            <div className="chips">

              {(plan.data || []).map(
                (data, index) => (
                  <div
                    className="chip"
                    key={index}
                  >
                    <strong>
                      {data.name}
                    </strong>

                    <span>
                      {(
                        data.fields || []
                      ).join(" · ")}
                    </span>
                  </div>
                )
              )}

            </div>

          </div>

          {/* ACTIONS */}
          <div className="section-card">

            <h3>
              🚀{" "}
              {zh
                ? "主要操作"
                : "Main Actions"}
            </h3>

            <div className="actions">

              {(plan.actions || []).map(
                (action, index) => (
                  <div
                    className="action"
                    key={index}
                  >
                    <strong>
                      {action.name}
                    </strong>

                    <span>
                      {action.description}
                    </span>
                  </div>
                )
              )}

            </div>

          </div>

          <div className="continue-box">

            <div>
              <strong>
                {zh
                  ? "准备好了吗？"
                  : "Ready to build?"}
              </strong>

              <p>
                {zh
                  ? "确认后进入下一阶段。"
                  : "Confirm your plan and continue."}
              </p>
            </div>

            <button
              className="generate"
              onClick={() => {
                alert(
                  zh
                    ? "下一阶段将在下一步加入。"
                    : "The next build stage will be added next."
                );
              }}
            >
              {zh
                ? "确认并继续 →"
                : "Confirm & Continue →"}
            </button>

          </div>

        </section>
      )}

      <footer>
        © 2026 AI App Builder
      </footer>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 0 22px 60px;
          color: #102417;
          background:
            radial-gradient(
              circle at 15% 10%,
              #ffffff,
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #edf7ef,
              #d9eadf
            );
          position: relative;
          overflow: hidden;
        }

        .glow {
          position: fixed;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: .22;
          pointer-events: none;
        }

        .glow-one {
          top: -220px;
          left: -150px;
          background: #62c889;
        }

        .glow-two {
          right: -200px;
          bottom: -220px;
          background: #31865a;
        }

        .nav {
          max-width: 1120px;
          margin: auto;
          padding-top: 26px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 43px;
          height: 43px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: white;
          background:
            linear-gradient(
              135deg,
              #237847,
              #76c994
            );
          box-shadow:
            0 12px 30px
            rgba(40,140,80,.25);
        }

        .brand-title {
          font-weight: 800;
          font-size: 16px;
        }

        .brand-subtitle {
          color: #718277;
          font-size: 10px;
          margin-top: 2px;
        }

        .language {
          border: 1px solid rgba(255,255,255,.8);
          background: rgba(255,255,255,.45);
          padding: 10px 15px;
          border-radius: 999px;
          cursor: pointer;
          color: #183323;
          font-weight: 700;
        }

        .hero {
          max-width: 900px;
          margin: 100px auto 0;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.45);
          border: 1px solid rgba(255,255,255,.8);
          color: #267348;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .7px;
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #59bc82;
          box-shadow: 0 0 0 5px rgba(89,188,130,.12);
        }

        h1 {
          font-size: clamp(56px,8vw,88px);
          line-height: .96;
          letter-spacing: -5px;
          margin: 24px 0 20px;
        }

        h1 span {
          background:
            linear-gradient(
              110deg,
              #237847,
              #78ca99
            );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .description {
          max-width: 650px;
          margin: auto;
          color: #617266;
          font-size: 17px;
          line-height: 1.7;
        }

        .builder {
          margin-top: 44px;
          padding: 23px;
          text-align: left;
          border-radius: 28px;
          background: rgba(255,255,255,.63);
          border: 1px solid rgba(255,255,255,.85);
          backdrop-filter: blur(25px);
          box-shadow:
            0 35px 100px
            rgba(35,90,55,.14);
        }

        .builder-heading {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
        }

        .ai-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #27764b;
          background: white;
        }

        .builder-heading strong {
          display: block;
          font-size: 16px;
        }

        .builder-heading small {
          display: block;
          margin-top: 4px;
          color: #728176;
        }

        textarea {
          width: 100%;
          min-height: 135px;
          border: 0;
          outline: 0;
          resize: vertical;
          padding: 18px;
          border-radius: 19px;
          background: rgba(255,255,255,.62);
          color: #102417;
          font-size: 16px;
          line-height: 1.6;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.035);
        }

        textarea:focus {
          box-shadow:
            inset 0 0 0 2px #54ae79;
        }

        .builder-bottom {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .hint {
          color: #718077;
          font-size: 11px;
        }

        .generate {
          border: 0;
          border-radius: 14px;
          padding: 14px 20px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #27784c,
              #72c994
            );
          box-shadow:
            0 12px 28px
            rgba(45,145,85,.25);
          cursor: pointer;
          font-weight: 800;
          transition: .2s;
        }

        .generate:hover {
          transform: translateY(-2px);
        }

        .generate:disabled {
          opacity: .65;
          cursor: wait;
        }

        .error {
          margin-top: 12px;
          padding: 12px;
          border-radius: 12px;
          background: #fff1f1;
          color: #b42318;
          font-size: 13px;
        }

        .examples {
          margin-top: 30px;
          text-align: left;
        }

        .examples-title {
          color: #718077;
          font-size: 11px;
          margin-bottom: 10px;
        }

        .example {
          width: 100%;
          border: 1px solid rgba(255,255,255,.75);
          background: rgba(255,255,255,.35);
          border-radius: 14px;
          margin-bottom: 8px;
          padding: 12px;
          display: grid;
          grid-template-columns: 35px 1fr 20px;
          align-items: center;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          color: #173123;
          font-size: 12px;
        }

        .example:hover {
          background: rgba(255,255,255,.65);
        }

        .example b {
          color: #328054;
        }

        .loading-card,
        .plan-section {
          max-width: 900px;
          margin: 80px auto 0;
          position: relative;
          z-index: 2;
        }

        .loading-card {
          text-align: center;
          padding: 60px 30px;
          border-radius: 30px;
          background: rgba(255,255,255,.62);
          border: 1px solid white;
          backdrop-filter: blur(20px);
        }

        .loading-orb {
          width: 70px;
          height: 70px;
          margin: auto;
          display: grid;
          place-items: center;
          border-radius: 22px;
          color: white;
          font-size: 28px;
          background: linear-gradient(135deg,#287a4d,#76cb99);
          animation: pulse 1.4s infinite;
        }

        @keyframes pulse {
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 40px rgba(70,180,110,.35);
          }
        }

        .loading-card h2 {
          margin-top: 25px;
        }

        .loading-card p {
          color: #6c7c70;
        }

        .loader {
          width: 220px;
          height: 5px;
          margin: 25px auto 0;
          border-radius: 20px;
          background: rgba(0,0,0,.07);
          overflow: hidden;
        }

        .loader span {
          display: block;
          height: 100%;
          width: 40%;
          background: #43a86c;
          animation: loading 1.2s infinite;
        }

        @keyframes loading {
          from {
            transform: translateX(-120%);
          }
          to {
            transform: translateX(550%);
          }
        }

        .back {
          border: 0;
          background: transparent;
          color: #34784f;
          cursor: pointer;
          font-weight: 700;
        }

        .plan-header {
          text-align: center;
          margin: 35px 0;
        }

        .success {
          color: #318054;
          font-size: 12px;
          font-weight: 800;
        }

        .plan-header h1 {
          margin: 14px 0;
          font-size: clamp(42px,6vw,68px);
          letter-spacing: -3px;
        }

        .plan-header p {
          color: #65766a;
          max-width: 600px;
          margin: auto;
          line-height: 1.6;
        }

        .section-card {
          margin-top: 15px;
          padding: 22px;
          border-radius: 22px;
          background: rgba(255,255,255,.62);
          border: 1px solid rgba(255,255,255,.85);
          backdrop-filter: blur(20px);
        }

        .section-card h3 {
          margin: 0 0 18px;
          font-size: 15px;
        }

        .item {
          display: flex;
          gap: 13px;
          padding: 13px 0;
          border-top: 1px solid rgba(0,0,0,.05);
        }

        .item-icon,
        .check {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #e4f3e9;
          color: #287a4c;
          font-size: 12px;
          font-weight: 800;
        }

        .item strong {
          font-size: 13px;
        }

        .item p {
          margin: 4px 0 0;
          color: #718077;
          font-size: 12px;
          line-height: 1.5;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chip {
          padding: 12px 14px;
          border-radius: 14px;
          background: #f0f7f2;
        }

        .chip strong {
          display: block;
          font-size: 12px;
        }

        .chip span {
          display: block;
          margin-top: 4px;
          color: #718077;
          font-size: 10px;
        }

        .action {
          padding: 13px 0;
          border-top: 1px solid rgba(0,0,0,.05);
        }

        .action strong {
          display: block;
          font-size: 13px;
        }

        .action span {
          display: block;
          margin-top: 4px;
          color: #718077;
          font-size: 12px;
        }

        .continue-box {
          margin-top: 20px;
          padding: 20px;
          border-radius: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background: #173d27;
          color: white;
        }

        .continue-box p {
          margin: 5px 0 0;
          opacity: .65;
          font-size: 11px;
        }

        footer {
          position: relative;
          z-index: 2;
          text-align: center;
          margin-top: 100px;
          color: #728077;
          font-size: 10px;
        }

        @media(max-width:700px) {

          .page {
            padding-left: 14px;
            padding-right: 14px;
          }

          .hero {
            margin-top: 70px;
          }

          h1 {
            font-size: 54px;
            letter-spacing: -3px;
          }

          .description {
            font-size: 15px;
          }

          .builder {
            padding: 16px;
            border-radius: 22px;
          }

          .builder-bottom {
            flex-direction: column;
            align-items: stretch;
          }

          .generate {
            width: 100%;
          }

          .continue-box {
            flex-direction: column;
            align-items: stretch;
          }

          .continue-box .generate {
            width: 100%;
          }

        }

      `}</style>
    </main>
  );
}
