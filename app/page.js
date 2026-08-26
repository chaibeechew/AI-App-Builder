"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [preview, setPreview] = useState(false);
  const [created, setCreated] = useState(false);
  const [activePage, setActivePage] = useState("");
  const [activeFeature, setActiveFeature] = useState(null);
  const [error, setError] = useState("");

  const [modifyInstruction, setModifyInstruction] = useState("");
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyMessage, setModifyMessage] = useState("");

  async function generateApp() {
    if (!idea.trim()) {
      setError("Please describe your app idea first.");
      return;
    }

    setLoading(true);
    setError("");
    setPlan(null);
    setPreview(false);
    setCreated(false);
    setActivePage("");
    setActiveFeature(null);
    setModifyMessage("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: idea.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Generation failed.");
      }

      if (!data?.specification) {
        throw new Error(
          "AI did not return a valid application specification."
        );
      }

      setPlan(data);

      const pages = Array.isArray(data.specification.pages)
        ? data.specification.pages
        : [];

      setActivePage(pages[0]?.name || "Main");
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function getPages() {
    const pages = plan?.specification?.pages;

    if (Array.isArray(pages) && pages.length > 0) {
      return pages;
    }

    return [
      {
        name: "Main",
        purpose: "Main application page.",
      },
    ];
  }

  function getFeatures() {
    const features = plan?.specification?.features;

    return Array.isArray(features) ? features : [];
  }

  function normalizeFeature(feature) {
    if (typeof feature === "string") {
      return {
        name: feature,
        description:
          "This feature was generated according to your application requirements.",
      };
    }

    return (
      feature || {
        name: "Feature",
        description: "AI generated application feature.",
      }
    );
  }

  function getPageFeatures(page) {
    if (!Array.isArray(page?.features)) {
      return [];
    }

    return page.features.map(normalizeFeature);
  }

  function continueToPreview() {
    const pages = getPages();

    setPreview(true);
    setCreated(false);
    setActiveFeature(null);
    setActivePage(pages[0]?.name || "Main");
    setModifyMessage("");
  }

  function createApp() {
    const pages = getPages();

    setCreated(true);
    setActivePage(pages[0]?.name || "Main");
    setActiveFeature(null);
    setModifyMessage("");
  }

  function backToPreview() {
    setCreated(false);
    setActiveFeature(null);
  }

  function goBackToPlan() {
    setPreview(false);
    setCreated(false);
    setActiveFeature(null);
    setActivePage("");
  }

  function selectPage(page) {
    setActivePage(page?.name || "Main");
    setActiveFeature(null);
  }

  function openFeature(feature) {
    setActiveFeature(normalizeFeature(feature));
  }

  function closeFeature() {
    setActiveFeature(null);
  }

  async function modifyApp() {
    if (!modifyInstruction.trim()) {
      return;
    }

    if (!plan?.specification) {
      setModifyMessage("No app specification is available.");
      return;
    }

    setModifyLoading(true);
    setModifyMessage("");
    setError("");

    try {
      const response = await fetch("/api/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instruction: modifyInstruction.trim(),
          specification: plan.specification,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Modification failed.");
      }

      if (!data?.specification) {
        throw new Error(
          "AI did not return a valid application specification."
        );
      }

      setPlan((current) => ({
        ...current,
        specification: data.specification,
      }));

      const pages = Array.isArray(data.specification.pages)
        ? data.specification.pages
        : [];

      setActivePage(pages[0]?.name || "Main");
      setActiveFeature(null);
      setModifyInstruction("");
      setModifyMessage("Changes applied successfully.");
    } catch (err) {
      setModifyMessage(
        err?.message || "Something went wrong."
      );
    } finally {
      setModifyLoading(false);
    }
  }

  const specification = plan?.specification || {};
  const pages = getPages();
  const features = getFeatures();

  const currentPage =
    pages.find((page) => page?.name === activePage) ||
    pages[0];

  function LandscapeBackground() {
    return (
      <div className="landscape" aria-hidden="true">
        <div className="sun" />
        <div className="mountain mountainOne" />
        <div className="mountain mountainTwo" />
        <div className="mountain mountainThree" />
        <div className="forest forestOne" />
        <div className="forest forestTwo" />
        <div className="lake" />
        <div className="lakeGlow" />
      </div>
    );
  }

  function Brand() {
    return (
      <div className="brand">
        <div className="brandMark">
          <span>✦</span>
        </div>

        <div>
          <div className="brandName">
            AI APP BUILDER
          </div>

          <div className="brandSub">
            Create. Shape. Build.
          </div>
        </div>
      </div>
    );
  }

  function ModifyPanel() {
    return (
      <section className="modifyPanel">
        <div className="modifyHeader">
          <div>
            <div className="eyebrow">
              AI MODIFICATION
            </div>

            <h3>
              Want to change something?
            </h3>

            <p>
              Tell AI what you want to improve,
              add or remove.
            </p>
          </div>

          <div className="aiOrb smallOrb">
            ✦
          </div>
        </div>

        <textarea
          value={modifyInstruction}
          onChange={(e) =>
            setModifyInstruction(e.target.value)
          }
          placeholder="Example: Add a customer dashboard and a booking page..."
          className="modifyInput"
        />

        <div className="modifyBottom">
          {modifyMessage ? (
            <span className="modifyMessage">
              {modifyMessage}
            </span>
          ) : (
            <span className="modifyHint">
              AI will update your application structure.
            </span>
          )}

          <button
            onClick={modifyApp}
            disabled={
              modifyLoading ||
              !modifyInstruction.trim()
            }
            className="primaryButton"
          >
            {modifyLoading
              ? "Updating..."
              : "Apply Changes →"}
          </button>
        </div>
      </section>
    );
  }

  function FeatureModal() {
    if (!activeFeature) {
      return null;
    }

    return (
      <div
        className="modalBackdrop"
        onClick={closeFeature}
      >
        <div
          className="featureModal"
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          <button
            className="closeButton"
            onClick={closeFeature}
          >
            ×
          </button>

          <div className="modalIcon">
            ✦
          </div>

          <div className="eyebrow">
            AI GENERATED FEATURE
          </div>

          <h2>
            {activeFeature.name}
          </h2>

          <p>
            {activeFeature.description}
          </p>

          <div className="modalTags">
            <span>AI Generated</span>
            <span>Customizable</span>
            <span>App Ready</span>
          </div>
        </div>
      </div>
    );
  }

  function PageContent({ mode = "preview" }) {
    if (!currentPage) {
      return null;
    }

    const pageFeatures =
      getPageFeatures(currentPage);

    const purpose =
      currentPage.purpose ||
      currentPage.description ||
      "AI generated application page.";

    return (
      <>
        <div className="pageHero">
          <div className="heroGlow" />

          <div className="eyebrow">
            {mode === "created"
              ? "GENERATED APP"
              : "LIVE APP PREVIEW"}
          </div>

          <h2>
            {currentPage.name ||
              "Application Page"}
          </h2>

          <p>
            {purpose}
          </p>
        </div>

        {pageFeatures.length > 0 ? (
          <section className="section">
            <div className="sectionHeading">
              <div>
                <div className="eyebrow">
                  PAGE FEATURES
                </div>

                <h3>
                  Built for your idea
                </h3>
              </div>

              <span className="countBadge">
                {pageFeatures.length}
              </span>
            </div>

            <div className="featureGrid">
              {pageFeatures.map(
                (feature, index) => (
                  <div
                    className="featureCard"
                    key={`${feature.name}-${index}`}
                  >
                    <div className="featureCardTop">
                      <div className="featureIcon">
                        ✦
                      </div>

                      <span className="featureNumber">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </div>

                    <h3>
                      {feature.name}
                    </h3>

                    <p>
                      {feature.description}
                    </p>

                    <button
                      onClick={() =>
                        openFeature(feature)
                      }
                      className="ghostButton"
                    >
                      Explore Feature →
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        ) : (
          <section className="emptyCard">
            <div className="emptyIcon">
              ✦
            </div>

            <h3>
              AI Generated Workspace
            </h3>

            <p>
              This application page was
              created according to your
              requirements.
            </p>
          </section>
        )}

        <section className="requirementsCard">
          <div>
            <div className="eyebrow">
              PAGE PURPOSE
            </div>

            <p>
              {purpose}
            </p>
          </div>

          <div className="statusTags">
            <span>Customer Requirements</span>
            <span>AI Generated</span>
            <span>Customizable</span>
          </div>
        </section>
      </>
    );
  }

  if (created && plan?.specification) {
    return (
      <main className="site">
        <LandscapeBackground />

        <div className="overlay" />

        <div className="appShell">
          <header className="appHeader">
            <Brand />

            <div className="headerRight">
              <span className="createdBadge">
                <span className="dot" />
                App Created
              </span>

              <button
                onClick={backToPreview}
                className="headerButton"
              >
                Preview
              </button>
            </div>
          </header>

          <div className="appWorkspace">
            <aside className="sidePanel">
              <div className="sideTop">
                <div className="eyebrow">
                  YOUR APP
                </div>

                <h2>
                  {specification.name ||
                    "My App"}
                </h2>

                <p>
                  {specification.description ||
                    "Your AI-generated application."}
                </p>
              </div>

              <div className="sideLabel">
                PAGES
              </div>

              <div className="pageList">
                {pages.map(
                  (page, index) => (
                    <button
                      key={`${page?.name}-${index}`}
                      onClick={() =>
                        selectPage(page)
                      }
                      className={
                        activePage === page?.name
                          ? "pageButton active"
                          : "pageButton"
                      }
                    >
                      <span className="pageIndex">
                        {index + 1}
                      </span>

                      <span className="pageName">
                        {page?.name ||
                          `Page ${index + 1}`}
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="sideBottom">
                <button
                  onClick={goBackToPlan}
                  className="ghostButton full"
                >
                  ← Back to Plan
                </button>
              </div>
            </aside>

            <section className="workspaceContent">
              <div className="mobilePageScroller">
                {pages.map(
                  (page, index) => (
                    <button
                      key={`${page?.name}-mobile-${index}`}
                      onClick={() =>
                        selectPage(page)
                      }
                      className={
                        activePage === page?.name
                          ? "mobilePage active"
                          : "mobilePage"
                      }
                    >
                      {page?.name ||
                        `Page ${index + 1}`}
                    </button>
                  )
                )}
              </div>

              <PageContent mode="created" />

              <ModifyPanel />
            </section>
          </div>
        </div>

        <FeatureModal />
        <GlobalStyles />
      </main>
    );
  }

  if (preview && plan?.specification) {
    return (
      <main className="site">
        <LandscapeBackground />

        <div className="overlay" />

        <div className="previewShell">
          <header className="previewHeader">
            <Brand />

            <div className="previewActions">
              <button
                onClick={goBackToPlan}
                className="headerButton"
              >
                ← Plan
              </button>

              <button
                onClick={createApp}
                className="primaryButton"
              >
                Create App →
              </button>
            </div>
          </header>

          <div className="previewWorkspace">
            <aside className="previewSide">
              <div className="eyebrow">
                APPLICATION
              </div>

              <h2>
                {specification.name ||
                  "My App"}
              </h2>

              <p>
                {specification.description ||
                  "Interactive application preview."}
              </p>

              <div className="sideLabel">
                PAGES
              </div>

              <div className="pageList">
                {pages.map(
                  (page, index) => (
                    <button
                      key={`${page?.name}-${index}`}
                      onClick={() =>
                        selectPage(page)
                      }
                      className={
                        activePage === page?.name
                          ? "pageButton active"
                          : "pageButton"
                      }
                    >
                      <span className="pageIndex">
                        {index + 1}
                      </span>

                      <span className="pageName">
                        {page?.name ||
                          `Page ${index + 1}`}
                      </span>
                    </button>
                  )
                )}
              </div>
            </aside>

            <section className="previewMain">
              <div className="previewTitleRow">
                <div>
                  <div className="eyebrow">
                    LIVE PREVIEW
                  </div>

                  <h1>
                    {activePage ||
                      "Application"}
                  </h1>
                </div>

                <span className="countBadge">
                  {pages.length} Pages
                </span>
              </div>

              <div className="mobilePageScroller">
                {pages.map(
                  (page, index) => (
                    <button
                      key={`${page?.name}-mobile-${index}`}
                      onClick={() =>
                        selectPage(page)
                      }
                      className={
                        activePage === page?.name
                          ? "mobilePage active"
                          : "mobilePage"
                      }
                    >
                      {page?.name ||
                        `Page ${index + 1}`}
                    </button>
                  )
                )}
              </div>

              <PageContent />

              {features.length > 0 && (
                <section className="section">
                  <div className="sectionHeading">
                    <div>
                      <div className="eyebrow">
                        APP FEATURES
                      </div>

                      <h3>
                        Across your application
                      </h3>
                    </div>
                  </div>

                  <div className="featureGrid">
                    {features.map(
                      (feature, index) => {
                        const item =
                          normalizeFeature(
                            feature
                          );

                        return (
                          <div
                            className="featureCard"
                            key={`${item.name}-${index}`}
                          >
                            <div className="featureCardTop">
                              <div className="featureIcon">
                                ✦
                              </div>

                              <span className="featureNumber">
                                {String(
                                  index + 1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>
                            </div>

                            <h3>
                              {item.name}
                            </h3>

                            <p>
                              {item.description}
                            </p>

                            <button
                              onClick={() =>
                                openFeature(
                                  item
                                )
                              }
                              className="ghostButton"
                            >
                              Open →
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>
              )}

              <ModifyPanel />
            </section>
          </div>
        </div>

        <FeatureModal />
        <GlobalStyles />
      </main>
    );
  }

  return (
    <main className="site">
      <LandscapeBackground />

      <div className="overlay" />

      <div className="home">
        <header className="homeHeader">
          <Brand />

          <div className="aiStatus">
            <span className="pulse" />
            AI Ready
          </div>
        </header>

        <section className="hero">
          <div className="heroOrb">
            <div className="orbRing ringOne" />
            <div className="orbRing ringTwo" />
            <div className="aiOrb">
              ✦
            </div>
          </div>

          <div className="eyebrow center">
            BUILD WITH AI
          </div>

          <h1>
            Turn your idea into
            <span>
              a real app.
            </span>
          </h1>

          <p>
            Describe what you want to build.
            AI will understand your idea,
            plan the application and create
            the structure for you.
          </p>

          <div className="ideaBox">
            <textarea
              value={idea}
              onChange={(e) =>
                setIdea(e.target.value)
              }
              placeholder="Describe the app you want to create..."
              className="ideaInput"
              maxLength={5000}
            />

            <div className="ideaBottom">
              <span className="ideaHint">
                {idea.length}/5000
              </span>

              <button
                onClick={generateApp}
                disabled={
                  loading ||
                  !idea.trim()
                }
                className="generateButton"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Understanding...
                  </>
                ) : (
                  <>
                    Generate My App
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="errorBox">
              <span>!</span>
              {error}
            </div>
          )}

          {loading && (
            <div className="loadingPanel">
              <div className="loadingOrb">
                ✦
              </div>

              <div>
                <strong>
                  AI is building your plan
                </strong>

                <p>
                  Understanding your idea
                  and designing the app
                  structure...
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="homeFeatures">
          <div className="miniCard">
            <span>✦</span>
            <div>
              <strong>
                Understand
              </strong>
              <small>
                AI understands your idea
              </small>
            </div>
          </div>

          <div className="miniCard">
            <span>◇</span>
            <div>
              <strong>
                Plan
              </strong>
              <small>
                Pages and features
              </small>
            </div>
          </div>

          <div className="miniCard">
            <span>⌁</span>
            <div>
              <strong>
                Create
              </strong>
              <small>
                Turn your plan into an app
              </small>
            </div>
          </div>
        </section>

        <footer className="homeFooter">
          <span>
            AI APP BUILDER
          </span>

          <span>
            Create something remarkable.
          </span>
        </footer>
      </div>

      <GlobalStyles />
    </main>
  );
}

function GlobalStyles() {
  return (
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
        background: #071a16;
        color: #f4fbf7;
      }

      button,
      textarea {
        font: inherit;
      }

      button {
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .site {
        min-height: 100vh;
        min-height: 100svh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(
            circle at 50% 10%,
            rgba(71, 171, 137, 0.18),
            transparent 35%
          ),
          linear-gradient(
            180deg,
            #061713 0%,
            #0b2820 48%,
            #06251f 100%
          );
      }

      .overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        background:
          linear-gradient(
            180deg,
            rgba(3, 18, 14, 0.12),
            rgba(2, 15, 12, 0.55)
          );
      }

      .landscape {
        position: fixed;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
      }

      .sun {
        position: absolute;
        width: 190px;
        height: 190px;
        border-radius: 50%;
        right: 13%;
        top: 9%;
        background:
          radial-gradient(
            circle,
            rgba(245, 211, 132, 0.6),
            rgba(245, 211, 132, 0.08) 50%,
            transparent 72%
          );
        filter: blur(1px);
      }

      .mountain {
        position: absolute;
        bottom: 30%;
        width: 75%;
        height: 35%;
        transform: rotate(45deg) skew(-12deg);
        transform-origin: bottom left;
        opacity: 0.38;
        background:
          linear-gradient(
            135deg,
            #123d30,
            #0a271f
          );
        border-radius: 8px;
      }

      .mountainOne {
        left: -16%;
      }

      .mountainTwo {
        left: 24%;
        bottom: 28%;
        opacity: 0.3;
      }

      .mountainThree {
        right: -25%;
        bottom: 31%;
        opacity: 0.28;
      }

      .forest {
        position: absolute;
        bottom: 26%;
        width: 100%;
        height: 20%;
        opacity: 0.8;
        background:
          linear-gradient(
            135deg,
            transparent 25%,
            #061b16 25%,
            #061b16 34%,
            transparent 34%,
            transparent 55%,
            #08251d 55%,
            #08251d 66%,
            transparent 66%
          );
        clip-path: polygon(
          0 100%,
          5% 65%,
          9% 86%,
          14% 50%,
          18% 78%,
          23% 44%,
          28% 80%,
          34% 54%,
          39% 82%,
          45% 48%,
          51% 78%,
          57% 43%,
          63% 77%,
          69% 52%,
          75% 82%,
          82% 45%,
          88% 76%,
          94% 53%,
          100% 70%,
          100% 100%
        );
      }

      .forestTwo {
        bottom: 22%;
        opacity: 0.55;
        transform: scale(1.2);
      }

      .lake {
        position: absolute;
        left: -10%;
        right: -10%;
        bottom: -8%;
        height: 43%;
        border-radius: 50% 50% 0 0;
        background:
          radial-gradient(
            ellipse at 50% 15%,
            rgba(66, 171, 157, 0.34),
            transparent 60%
          ),
          linear-gradient(
            180deg,
            #0b544c,
            #062d29
          );
        transform: perspective(500px)
          rotateX(18deg);
      }

      .lakeGlow {
        position: absolute;
        left: 20%;
        right: 20%;
        bottom: 10%;
        height: 18%;
        background:
          linear-gradient(
            180deg,
            transparent,
            rgba(113, 219, 190, 0.08),
            transparent
          );
        filter: blur(15px);
      }

      .home,
      .appShell,
      .previewShell {
        position: relative;
        z-index: 2;
        width: min(
          1440px,
          calc(100% - 40px)
        );
        margin: 0 auto;
      }

      .homeHeader,
      .appHeader,
      .previewHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 28px 0;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .brandMark {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border: 1px solid
          rgba(159, 235, 203, 0.3);
        border-radius: 14px;
        display: grid;
        place-items: center;
        background:
          linear-gradient(
            135deg,
            rgba(52, 148, 110, 0.55),
            rgba(10, 69, 57, 0.65)
          );
        box-shadow:
          0 10px 30px
            rgba(0, 0, 0, 0.2);
        color: #b8f6d9;
      }

      .brandName {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.18em;
        white-space: nowrap;
      }

      .brandSub {
        color: #8eb9a8;
        font-size: 11px;
        margin-top: 3px;
      }

      .aiStatus,
      .createdBadge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 13px;
        border-radius: 999px;
        background:
          rgba(8, 46, 37, 0.72);
        border: 1px solid
          rgba(126, 224, 188, 0.18);
        color: #b7e9d3;
        font-size: 12px;
        font-weight: 700;
      }

      .pulse,
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #71d7ae;
        box-shadow:
          0 0 0 5px
            rgba(113, 215, 174, 0.08),
          0 0 15px
            rgba(113, 215, 174, 0.5);
      }

      .hero {
        max-width: 930px;
        margin: 4vh auto 0;
        text-align: center;
      }

      .heroOrb {
        position: relative;
        width: 96px;
        height: 96px;
        margin: 0 auto 26px;
        display: grid;
        place-items: center;
      }

      .aiOrb {
        width: 64px;
        height: 64px;
        border-radius: 22px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(
            circle at 30% 20%,
            #87e8c0,
            #237e61 42%,
            #0b3328
          );
        color: #edfff7;
        font-size: 25px;
        border: 1px solid
          rgba(175, 244, 214, 0.35);
        box-shadow:
          0 0 45px
            rgba(68, 195, 148, 0.22),
          inset 0 1px 0
            rgba(255, 255, 255, 0.15);
      }

      .smallOrb {
        width: 42px;
        height: 42px;
        border-radius: 15px;
        font-size: 17px;
      }

      .orbRing {
        position: absolute;
        inset: 5px;
        border: 1px solid
          rgba(112, 225, 185, 0.22);
        border-radius: 50%;
        animation: spin 12s linear infinite;
      }

      .ringTwo {
        inset: -4px;
        border-style: dashed;
        opacity: 0.45;
        animation-duration: 18s;
        animation-direction: reverse;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .eyebrow {
        color: #76c8a5;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .center {
        text-align: center;
      }

      .hero h1 {
        margin: 13px auto 18px;
        max-width: 850px;
        font-size: clamp(
          42px,
          7vw,
          78px
        );
        line-height: 0.98;
        letter-spacing: -0.055em;
        font-weight: 800;
      }

      .hero h1 span {
        display: block;
        color: #91e6bf;
        text-shadow:
          0 0 45px
            rgba(89, 213, 164, 0.18);
      }

      .hero > p {
        max-width: 680px;
        margin: 0 auto 30px;
        color: #a8c8bb;
        font-size: 16px;
        line-height: 1.7;
      }

      .ideaBox {
        padding: 9px;
        border-radius: 24px;
        background:
          rgba(5, 26, 21, 0.8);
        border: 1px solid
          rgba(133, 224, 190, 0.18);
        box-shadow:
          0 25px 80px
            rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(18px);
        text-align: left;
      }

      .ideaInput,
      .modifyInput {
        width: 100%;
        resize: vertical;
        outline: none;
        color: #edf9f3;
        background: transparent;
        border: 0;
        padding: 20px;
        line-height: 1.6;
      }

      .ideaInput {
        min-height: 155px;
        font-size: 16px;
      }

      .ideaInput::placeholder,
      .modifyInput::placeholder {
        color: #62877a;
      }

      .ideaBottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 10px;
        border-top: 1px solid
          rgba(133, 224, 190, 0.1);
      }

      .ideaHint,
      .modifyHint {
        color: #638c7d;
        font-size: 11px;
      }

      .generateButton,
      .primaryButton {
        border: 0;
        color: #062018;
        font-weight: 800;
        border-radius: 14px;
        padding: 13px 18px;
        background:
          linear-gradient(
            135deg,
            #a3efd0,
            #55c79b
          );
        box-shadow:
          0 12px 30px
            rgba(71, 194, 145, 0.18);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .generateButton:hover,
      .primaryButton:hover {
        transform: translateY(-2px);
        box-shadow:
          0 18px 35px
            rgba(71, 194, 145, 0.25);
      }

      .generateButton span {
        margin-left: 10px;
      }

      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid
          rgba(6, 32, 24, 0.3);
        border-top-color: #062018;
        border-radius: 50%;
        margin-right: 8px;
        vertical-align: -2px;
        animation: spin 0.8s linear infinite;
      }

      .errorBox {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 14px auto 0;
        max-width: 760px;
        padding: 13px 16px;
        color: #ffd0cc;
        background:
          rgba(107, 25, 25, 0.5);
        border: 1px solid
          rgba(255, 130, 120, 0.2);
        border-radius: 13px;
        text-align: left;
        font-size: 13px;
      }

      .errorBox span {
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #a9423a;
      }

      .loadingPanel {
        max-width: 620px;
        margin: 22px auto 0;
        padding: 18px;
        display: flex;
        align-items: center;
        gap: 15px;
        text-align: left;
        border-radius: 18px;
        background:
          rgba(7, 40, 32, 0.75);
        border: 1px solid
          rgba(126, 224, 188, 0.15);
      }

      .loadingOrb {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        color: #9de8c5;
        background:
          rgba(60, 166, 126, 0.18);
        animation: breathe 1.6s ease-in-out infinite;
      }

      @keyframes breathe {
        50% {
          transform: scale(1.08);
          box-shadow:
            0 0 30px
              rgba(75, 203, 154, 0.2);
        }
      }

      .loadingPanel strong {
        font-size: 13px;
      }

      .loadingPanel p {
        margin: 4px 0 0;
        color: #759d8e;
        font-size: 11px;
      }

      .homeFeatures {
        max-width: 800px;
        margin: 65px auto 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .miniCard {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 15px;
        border-radius: 16px;
        background:
          rgba(6, 36, 29, 0.58);
        border: 1px solid
          rgba(126, 224, 188, 0.1);
        backdrop-filter: blur(12px);
      }

      .miniCard > span {
        color: #7bd7b0;
        font-size: 19px;
      }

      .miniCard strong,
      .miniCard small {
        display: block;
      }

      .miniCard strong {
        font-size: 12px;
      }

      .miniCard small {
        margin-top: 3px;
        color: #648b7c;
        font-size: 10px;
      }

      .homeFooter {
        margin: 65px 0 25px;
        display: flex;
        justify-content: space-between;
        gap: 15px;
        color: #527568;
        font-size: 9px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      .appWorkspace,
      .previewWorkspace {
        display: grid;
        grid-template-columns: 270px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .sidePanel,
      .previewSide,
      .previewMain,
      .workspaceContent {
        min-width: 0;
      }

      .sidePanel,
      .previewSide {
        position: sticky;
        top: 18px;
        padding: 22px;
        border-radius: 22px;
        background:
          rgba(5, 29, 23, 0.78);
        border: 1px solid
          rgba(126, 224, 188, 0.13);
        backdrop-filter: blur(18px);
      }

      .sideTop h2,
      .previewSide h2 {
        margin: 7px 0 7px;
        font-size: 22px;
        letter-spacing: -0.035em;
      }

      .sideTop p,
      .previewSide p {
        margin: 0;
        color: #719688;
        font-size: 11px;
        line-height: 1.6;
      }

      .sideLabel {
        margin: 28px 0 9px;
        color: #5f8a7a;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.16em;
      }

      .pageList {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .pageButton {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
        border: 1px solid transparent;
        color: #8eb0a3;
        background: transparent;
        border-radius: 12px;
        padding: 10px;
      }

      .pageButton:hover {
        background:
          rgba(67, 160, 123, 0.08);
      }

      .pageButton.active {
        color: #effff8;
        background:
          linear-gradient(
            135deg,
            rgba(36, 119, 88, 0.9),
            rgba(12, 81, 67, 0.9)
          );
        border-color:
          rgba(125, 227, 189, 0.16);
      }

      .pageIndex {
        display: grid;
        place-items: center;
        width: 25px;
        height: 25px;
        flex: 0 0 25px;
        border-radius: 8px;
        color: #76b69d;
        background:
          rgba(255, 255, 255, 0.06);
        font-size: 9px;
      }

      .pageName {
        min-width: 0;
        overflow-wrap: anywhere;
        font-size: 12px;
      }

      .sideBottom {
        margin-top: 28px;
        padding-top: 18px;
        border-top: 1px solid
          rgba(126, 224, 188, 0.08);
      }

      .ghostButton,
      .headerButton {
        border: 1px solid
          rgba(126, 224, 188, 0.14);
        background:
          rgba(255, 255, 255, 0.035);
        color: #9cc3b5;
        border-radius: 11px;
        padding: 10px 13px;
        font-size: 11px;
        font-weight: 700;
      }

      .ghostButton:hover,
      .headerButton:hover {
        background:
          rgba(126, 224, 188, 0.08);
        color: #d8fff0;
      }

      .full {
        width: 100%;
      }

      .headerRight,
      .previewActions {
        display: flex;
        align-items: center;
        gap: 9px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .workspaceContent,
      .previewMain {
        padding-bottom: 60px;
      }

      .mobilePageScroller {
        display: none;
        gap: 7px;
        overflow-x: auto;
        padding-bottom: 12px;
        scrollbar-width: none;
      }

      .mobilePageScroller::-webkit-scrollbar {
        display: none;
      }

      .mobilePage {
        flex: 0 0 auto;
        white-space: nowrap;
        padding: 8px 12px;
        border-radius: 999px;
        color: #7fa699;
        background:
          rgba(5, 29, 23, 0.7);
        border: 1px solid
          rgba(126, 224, 188, 0.1);
        font-size: 10px;
      }

      .mobilePage.active {
        color: #eafff5;
        background:
          #177456;
      }

      .pageHero {
        position: relative;
        overflow: hidden;
        padding: 30px;
        margin-bottom: 22px;
        border-radius: 24px;
        background:
          linear-gradient(
            135deg,
            rgba(12, 71, 56, 0.8),
            rgba(5, 32, 27, 0.85)
          );
        border: 1px solid
          rgba(126, 224, 188, 0.14);
      }

      .heroGlow {
        position: absolute;
        width: 260px;
        height: 260px;
        right: -80px;
        top: -120px;
        border-radius: 50%;
        background:
          rgba(81, 202, 153, 0.12);
        filter: blur(20px);
      }

      .pageHero h2 {
        position: relative;
        margin: 9px 0 8px;
        font-size: clamp(
          26px,
          4vw,
          40px
        );
        letter-spacing: -0.045em;
      }

      .pageHero p {
        position: relative;
        max-width: 720px;
        margin: 0;
        color: #9bbdaf;
        line-height: 1.7;
        font-size: 13px;
      }

      .section {
        margin-bottom: 22px;
      }

      .sectionHeading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 12px;
      }

      .sectionHeading h3 {
        margin: 5px 0 0;
        font-size: 18px;
        letter-spacing: -0.025em;
      }

      .countBadge {
        padding: 7px 10px;
        border-radius: 999px;
        color: #a7dfc6;
        background:
          rgba(79, 184, 142, 0.1);
        border: 1px solid
          rgba(126, 224, 188, 0.12);
        font-size: 10px;
        font-weight: 800;
      }

      .featureGrid {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(210px, 1fr)
        );
        gap: 12px;
      }

      .featureCard {
        min-width: 0;
        padding: 18px;
        border-radius: 18px;
        background:
          rgba(6, 34, 28, 0.72);
        border: 1px solid
          rgba(126, 224, 188, 0.1);
        backdrop-filter: blur(12px);
      }

      .featureCardTop {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .featureIcon,
      .emptyIcon,
      .modalIcon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        color: #9ce7c3;
        background:
          rgba(64, 177, 132, 0.12);
      }

      .featureNumber {
        color: #476e61;
        font-size: 10px;
        font-weight: 800;
      }

      .featureCard h3 {
        margin: 20px 0 7px;
        font-size: 15px;
        overflow-wrap: anywhere;
      }

      .featureCard p {
        min-height: 50px;
        margin: 0 0 14px;
        color: #76998d;
        line-height: 1.65;
        font-size: 11px;
        overflow-wrap: anywhere;
      }

      .emptyCard,
      .requirementsCard,
      .modifyPanel {
        margin-bottom: 22px;
        padding: 22px;
        border-radius: 20px;
        background:
          rgba(5, 31, 25, 0.72);
        border: 1px solid
          rgba(126, 224, 188, 0.1);
      }

      .emptyCard h3 {
        margin: 14px 0 6px;
      }

      .emptyCard p,
      .requirementsCard p {
        margin: 0;
        color: #789b8e;
        font-size: 12px;
        line-height: 1.7;
      }

      .requirementsCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .statusTags,
      .modalTags {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .statusTags span,
      .modalTags span {
        padding: 7px 9px;
        border-radius: 999px;
        color: #75a895;
        background:
          rgba(126, 224, 188, 0.05);
        border: 1px solid
          rgba(126, 224, 188, 0.08);
        font-size: 9px;
      }

      .modifyPanel {
        background:
          linear-gradient(
            135deg,
            rgba(11, 66, 51, 0.7),
            rgba(4, 28, 23, 0.8)
          );
      }

      .modifyHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
      }

      .modifyHeader h3 {
        margin: 5px 0;
        font-size: 17px;
      }

      .modifyHeader p {
        margin: 0;
        color: #72978a;
        font-size: 11px;
      }

      .modifyInput {
        min-height: 105px;
        margin-top: 12px;
        border-radius: 14px;
        background:
          rgba(0, 0, 0, 0.14);
        border: 1px solid
          rgba(126, 224, 188, 0.08);
        font-size: 13px;
      }

      .modifyBottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-top: 10px;
      }

      .modifyMessage {
        color: #86ddb4;
        font-size: 11px;
      }

      .previewTitleRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 15px;
      }

      .previewTitleRow h1 {
        margin: 6px 0 0;
        font-size: clamp(
          24px,
          4vw,
          36px
        );
        letter-spacing: -0.04em;
      }

      .modalBackdrop {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: 20px;
        background:
          rgba(1, 11, 9, 0.75);
        backdrop-filter: blur(10px);
      }

      .featureModal {
        position: relative;
        width: min(520px, 100%);
        padding: 30px;
        border-radius: 24px;
        background:
          linear-gradient(
            145deg,
            #0b3026,
            #061c17
          );
        border: 1px solid
          rgba(126, 224, 188, 0.18);
        box-shadow:
          0 30px 100px
            rgba(0, 0, 0, 0.55);
      }

      .closeButton {
        position: absolute;
        right: 14px;
        top: 14px;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 10px;
        color: #8aafa1;
        background:
          rgba(255, 255, 255, 0.05);
        font-size: 22px;
      }

      .featureModal h2 {
        margin: 12px 0 9px;
        font-size: 28px;
        overflow-wrap: anywhere;
      }

      .featureModal p {
        color: #86a99b;
        line-height: 1.7;
        font-size: 13px;
      }

      .modalTags {
        margin-top: 20px;
      }

      @media (max-width: 900px) {
        .appWorkspace,
        .previewWorkspace {
          grid-template-columns: 1fr;
        }

        .sidePanel,
        .previewSide {
          position: static;
        }

        .sidePanel .pageList,
        .previewSide .pageList {
          display: none;
        }

        .mobilePageScroller {
          display: flex;
        }

        .sideBottom {
          display: none;
        }

        .requirementsCard {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      @media (max-width: 680px) {
        .home,
        .appShell,
        .previewShell {
          width: min(
            100% - 24px,
            1440px
          );
        }

        .homeHeader,
        .appHeader,
        .previewHeader {
          padding: 16px 0;
        }

        .brandMark {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
          border-radius: 11px;
        }

        .brandName {
          font-size: 10px;
          letter-spacing: 0.13em;
        }

        .brandSub {
          font-size: 9px;
        }

        .aiStatus,
        .createdBadge {
          padding: 7px 9px;
          font-size: 9px;
        }

        .hero {
          margin-top: 3vh;
        }

        .heroOrb {
          margin-bottom: 18px;
          transform: scale(0.82);
        }

        .hero h1 {
          font-size: clamp(
            38px,
            12vw,
            58px
          );
        }

        .hero > p {
          font-size: 13px;
          line-height: 1.65;
          padding: 0 8px;
        }

        .ideaBox {
          border-radius: 18px;
        }

        .ideaInput {
          min-height: 135px;
          padding: 15px;
          font-size: 14px;
        }

        .ideaBottom {
          align-items: stretch;
          flex-direction: column;
        }

        .ideaHint {
          padding: 0 4px;
        }

        .generateButton {
          width: 100%;
          padding: 13px;
        }

        .homeFeatures {
          grid-template-columns: 1fr;
          margin-top: 35px;
        }

        .homeFooter {
          margin-top: 40px;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .headerRight,
        .previewActions {
          gap: 5px;
        }

        .headerButton {
          padding: 8px 10px;
          font-size: 9px;
        }

        .appWorkspace,
        .previewWorkspace {
          gap: 10px;
        }

        .sidePanel,
        .previewSide {
          padding: 16px;
          border-radius: 17px;
        }

        .sideTop h2,
        .previewSide h2 {
          font-size: 19px;
        }

        .pageHero {
          padding: 21px;
          border-radius: 18px;
        }

        .pageHero h2 {
          font-size: 28px;
        }

        .pageHero p {
          font-size: 12px;
        }

        .featureGrid {
          grid-template-columns: 1fr;
        }

        .featureCard {
          padding: 16px;
        }

        .requirementsCard,
        .emptyCard,
        .modifyPanel {
          padding: 17px;
          border-radius: 17px;
        }

        .modifyBottom {
          align-items: stretch;
          flex-direction: column;
        }

        .modifyBottom .primaryButton {
          width: 100%;
        }

        .previewTitleRow {
          align-items: flex-start;
          flex-direction: column;
        }

        .previewTitleRow .countBadge {
          align-self: flex-start;
        }

        .sun {
          width: 130px;
          height: 130px;
          right: -20px;
          top: 10%;
        }

        .lake {
          height: 35%;
        }
      }

      @media (max-width: 420px) {
        .home,
        .appShell,
        .previewShell {
          width: calc(100% - 18px);
        }

        .hero h1 {
          font-size: 39px;
        }

        .brandSub {
          display: none;
        }

        .aiStatus {
          padding: 6px 8px;
        }

        .pageHero h2 {
          font-size: 25px;
        }

        .sectionHeading h3 {
          font-size: 16px;
        }

        .featureCard h3 {
          font-size: 14px;
        }

        .featureCard p {
          min-height: auto;
        }
      }
    `}</style>
  );
}
