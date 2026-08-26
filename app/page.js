"use client";

import { useState } from "react";

const DEFAULT_PAGE = {
  name: "Main",
  purpose: "Your main application workspace.",
  features: [],
};

function normalizeFeature(feature) {
  if (typeof feature === "string") {
    return {
      name: feature,
      description: "AI generated feature for your application.",
    };
  }

  return {
    name: feature?.name || "Feature",
    description:
      feature?.description ||
      "AI generated feature for your application.",
  };
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const [screen, setScreen] = useState("home");
  const [activePage, setActivePage] = useState("");
  const [activeFeature, setActiveFeature] = useState(null);

  const [error, setError] = useState("");

  const [modifyInstruction, setModifyInstruction] = useState("");
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyMessage, setModifyMessage] = useState("");

  const specification = plan?.specification || {};

  const pages =
    Array.isArray(specification.pages) &&
    specification.pages.length
      ? specification.pages
      : [DEFAULT_PAGE];

  const features = Array.isArray(specification.features)
    ? specification.features
    : [];

  const currentPage =
    pages.find((page) => page?.name === activePage) ||
    pages[0] ||
    DEFAULT_PAGE;

  async function generateApp() {
    if (!idea.trim()) {
      setError("Please describe your app idea first.");
      return;
    }

    setLoading(true);
    setError("");
    setPlan(null);
    setScreen("home");
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
        throw new Error(
          data?.error || "Generation failed."
        );
      }

      if (!data?.specification) {
        throw new Error(
          "AI did not return a valid application specification."
        );
      }

      setPlan(data);

      const generatedPages = Array.isArray(
        data.specification.pages
      )
        ? data.specification.pages
        : [];

      setActivePage(
        generatedPages[0]?.name || "Main"
      );

      setScreen("plan");
    } catch (err) {
      setError(
        err?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function openPreview() {
    setActiveFeature(null);
    setModifyMessage("");
    setScreen("preview");
  }

  function createApp() {
    setActiveFeature(null);
    setModifyMessage("");
    setScreen("created");
  }

  function backToPlan() {
    setActiveFeature(null);
    setScreen("plan");
  }

  function backToPreview() {
    setActiveFeature(null);
    setScreen("preview");
  }

  function startNewApp() {
    setIdea("");
    setPlan(null);
    setError("");
    setActivePage("");
    setActiveFeature(null);
    setModifyInstruction("");
    setModifyMessage("");
    setScreen("home");
  }

  function selectPage(page) {
    setActivePage(page?.name || "Main");
    setActiveFeature(null);
  }

  function openFeature(feature) {
    setActiveFeature(normalizeFeature(feature));
  }

  async function modifyApp() {
    if (!modifyInstruction.trim()) {
      return;
    }

    if (!plan?.specification) {
      setModifyMessage(
        "No application specification is available."
      );
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
        throw new Error(
          data?.error || "Modification failed."
        );
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

      const updatedPages = Array.isArray(
        data.specification.pages
      )
        ? data.specification.pages
        : [];

      setActivePage(
        updatedPages[0]?.name || "Main"
      );

      setActiveFeature(null);
      setModifyInstruction("");
      setModifyMessage(
        "Your changes have been applied."
      );
    } catch (err) {
      setModifyMessage(
        err?.message || "Something went wrong."
      );
    } finally {
      setModifyLoading(false);
    }
  }

  return (
    <>
      <main className="app">
        <Background />

        <div className="pageLayer">
          <Header
            screen={screen}
            onNew={startNewApp}
          />

          {screen === "home" && (
            <HomeScreen
              idea={idea}
              setIdea={setIdea}
              loading={loading}
              error={error}
              onGenerate={generateApp}
            />
          )}

          {screen === "plan" && (
            <PlanScreen
              specification={specification}
              pages={pages}
              activePage={activePage}
              onSelectPage={selectPage}
              onPreview={openPreview}
              onNew={startNewApp}
            />
          )}

          {screen === "preview" && (
            <PreviewScreen
              specification={specification}
              pages={pages}
              features={features}
              currentPage={currentPage}
              activePage={activePage}
              onSelectPage={selectPage}
              onFeature={openFeature}
              onBack={backToPlan}
              onCreate={createApp}
              modifyInstruction={modifyInstruction}
              setModifyInstruction={
                setModifyInstruction
              }
              modifyLoading={modifyLoading}
              modifyMessage={modifyMessage}
              onModify={modifyApp}
            />
          )}

          {screen === "created" && (
            <CreatedScreen
              specification={specification}
              pages={pages}
              currentPage={currentPage}
              activePage={activePage}
              onSelectPage={selectPage}
              onFeature={openFeature}
              onBack={backToPreview}
              onNew={startNewApp}
              modifyInstruction={modifyInstruction}
              setModifyInstruction={
                setModifyInstruction
              }
              modifyLoading={modifyLoading}
              modifyMessage={modifyMessage}
              onModify={modifyApp}
            />
          )}
        </div>

        {activeFeature && (
          <FeatureModal
            feature={activeFeature}
            onClose={() => setActiveFeature(null)}
          />
        )}
      </main>

      <GlobalStyles />
    </>
  );
}

/* =========================================================
   BACKGROUND
========================================================= */

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />
      <div className="backgroundGlow glowThree" />

      <div className="waterSurface">
        <div className="waterLine lineOne" />
        <div className="waterLine lineTwo" />
        <div className="waterLine lineThree" />
        <div className="waterLine lineFour" />
      </div>

      <div className="goldLight" />
      <div className="gridPattern" />
      <div className="vignette" />
    </div>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({ screen, onNew }) {
  return (
    <header className="header">
      <div className="logoArea">
        <div className="logoMark">
          <span>✦</span>
        </div>

        <div>
          <div className="logoName">
            AI APP BUILDER
          </div>

          <div className="logoTagline">
            Create. Shape. Build.
          </div>
        </div>
      </div>

      <div className="headerRight">
        {screen !== "home" && (
          <button
            className="headerNew"
            onClick={onNew}
          >
            + New App
          </button>
        )}

        <div className="aiIndicator">
          <span className="statusDot" />
          <span>AI Ready</span>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   HOME
========================================================= */

function HomeScreen({
  idea,
  setIdea,
  loading,
  error,
  onGenerate,
}) {
  return (
    <section className="homeScreen">
      <div className="heroOrb">
        <div className="orbOuter outerOne" />
        <div className="orbOuter outerTwo" />

        <div className="orbCore">
          <span>✦</span>
        </div>
      </div>

      <div className="eyebrow center">
        BUILD WITH AI
      </div>

      <h1 className="heroTitle">
        Your idea.
        <span>Your app.</span>
      </h1>

      <p className="heroDescription">
        Describe what you want to build and let AI
        turn your idea into a structured application.
      </p>

      <div className="ideaPanel">
        <textarea
          value={idea}
          onChange={(event) =>
            setIdea(event.target.value)
          }
          className="ideaInput"
          maxLength={5000}
          placeholder="Describe the app you want to create..."
        />

        <div className="ideaFooter">
          <div className="characterCount">
            {idea.length} / 5000
          </div>

          <button
            className="generateButton"
            onClick={onGenerate}
            disabled={
              loading || !idea.trim()
            }
          >
            {loading ? (
              <>
                <span className="spinner" />
                Building...
              </>
            ) : (
              <>
                Generate My App
                <span className="arrow">→</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="errorMessage">
          <span>!</span>
          {error}
        </div>
      )}

      {loading && (
        <div className="generationStatus">
          <div className="statusIcon">
            ✦
          </div>

          <div>
            <strong>
              AI is understanding your idea
            </strong>

            <p>
              Planning your application structure,
              pages and features...
            </p>
          </div>
        </div>
      )}

      <div className="processCards">
        <ProcessCard
          number="01"
          icon="✦"
          title="Understand"
          text="AI understands your idea."
        />

        <ProcessCard
          number="02"
          icon="◇"
          title="Plan"
          text="Pages and features are structured."
        />

        <ProcessCard
          number="03"
          icon="⌁"
          title="Build"
          text="Turn the plan into your app."
        />
      </div>

      <div className="homeBottom">
        <span>AI APP BUILDER</span>
        <span>Powered by intelligent creation.</span>
      </div>
    </section>
  );
}

function ProcessCard({
  number,
  icon,
  title,
  text,
}) {
  return (
    <div className="processCard">
      <div className="processTop">
        <div className="processIcon">
          {icon}
        </div>

        <span>{number}</span>
      </div>

      <strong>{title}</strong>

      <p>{text}</p>
    </div>
  );
}

/* =========================================================
   PLAN
========================================================= */

function PlanScreen({
  specification,
  pages,
  activePage,
  onSelectPage,
  onPreview,
  onNew,
}) {
  return (
    <section className="workspaceScreen">
      <div className="workspaceIntro">
        <div>
          <div className="eyebrow">
            APPLICATION PLAN
          </div>

          <h1>
            {specification.name ||
              "Your New Application"}
          </h1>

          <p>
            {specification.description ||
              "AI has created an application structure based on your idea."}
          </p>
        </div>

        <div className="introActions">
          <button
            className="secondaryButton"
            onClick={onNew}
          >
            Start Over
          </button>

          <button
            className="primaryButton"
            onClick={onPreview}
          >
            Preview App →
          </button>
        </div>
      </div>

      <div className="workspaceGrid">
        <PageNavigation
          pages={pages}
          activePage={activePage}
          onSelectPage={onSelectPage}
        />

        <div className="workspaceMain">
          <PageOverview
            page={
              pages.find(
                (item) =>
                  item?.name === activePage
              ) || pages[0]
            }
          />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PREVIEW
========================================================= */

function PreviewScreen({
  specification,
  pages,
  features,
  currentPage,
  activePage,
  onSelectPage,
  onFeature,
  onBack,
  onCreate,
  modifyInstruction,
  setModifyInstruction,
  modifyLoading,
  modifyMessage,
  onModify,
}) {
  return (
    <section className="workspaceScreen">
      <div className="topBar">
        <div>
          <div className="eyebrow">
            LIVE PREVIEW
          </div>

          <h1>
            {specification.name ||
              "Application Preview"}
          </h1>
        </div>

        <div className="topBarActions">
          <button
            className="secondaryButton"
            onClick={onBack}
          >
            ← Plan
          </button>

          <button
            className="primaryButton"
            onClick={onCreate}
          >
            Create App →
          </button>
        </div>
      </div>

      <div className="mobilePageNav">
        {pages.map((page, index) => (
          <button
            key={`${page?.name}-${index}`}
            className={
              activePage === page?.name
                ? "mobilePage active"
                : "mobilePage"
            }
            onClick={() =>
              onSelectPage(page)
            }
          >
            {page?.name ||
              `Page ${index + 1}`}
          </button>
        ))}
      </div>

      <div className="workspaceGrid">
        <PageNavigation
          pages={pages}
          activePage={activePage}
          onSelectPage={onSelectPage}
        />

        <div className="workspaceMain">
          <PageOverview
            page={currentPage}
            preview
            onFeature={onFeature}
          />

          {features.length > 0 && (
            <FeatureSection
              features={features}
              onFeature={onFeature}
            />
          )}

          <ModifyPanel
            instruction={modifyInstruction}
            setInstruction={setModifyInstruction}
            loading={modifyLoading}
            message={modifyMessage}
            onModify={onModify}
          />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CREATED APP
========================================================= */

function CreatedScreen({
  specification,
  pages,
  currentPage,
  activePage,
  onSelectPage,
  onFeature,
  onBack,
  onNew,
  modifyInstruction,
  setModifyInstruction,
  modifyLoading,
  modifyMessage,
  onModify,
}) {
  return (
    <section className="workspaceScreen">
      <div className="createdHeader">
        <div>
          <div className="createdStatus">
            <span className="statusDot" />
            APPLICATION CREATED
          </div>

          <h1>
            {specification.name ||
              "Your Application"}
          </h1>

          <p>
            Your application structure is ready.
          </p>
        </div>

        <div className="topBarActions">
          <button
            className="secondaryButton"
            onClick={onBack}
          >
            Preview
          </button>

          <button
            className="primaryButton"
            onClick={onNew}
          >
            + New App
          </button>
        </div>
      </div>

      <div className="mobilePageNav">
        {pages.map((page, index) => (
          <button
            key={`${page?.name}-${index}`}
            className={
              activePage === page?.name
                ? "mobilePage active"
                : "mobilePage"
            }
            onClick={() =>
              onSelectPage(page)
            }
          >
            {page?.name ||
              `Page ${index + 1}`}
          </button>
        ))}
      </div>

      <div className="workspaceGrid">
        <PageNavigation
          pages={pages}
          activePage={activePage}
          onSelectPage={onSelectPage}
        />

        <div className="workspaceMain">
          <PageOverview
            page={currentPage}
            created
            onFeature={onFeature}
          />

          <ModifyPanel
            instruction={modifyInstruction}
            setInstruction={setModifyInstruction}
            loading={modifyLoading}
            message={modifyMessage}
            onModify={onModify}
          />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

function PageNavigation({
  pages,
  activePage,
  onSelectPage,
}) {
  return (
    <aside className="pageNavigation">
      <div className="navEyebrow">
        YOUR APP
      </div>

      <div className="navTitle">
        Pages
      </div>

      <div className="desktopPageList">
        {pages.map((page, index) => (
          <button
            key={`${page?.name}-${index}`}
            onClick={() =>
              onSelectPage(page)
            }
            className={
              activePage === page?.name
                ? "pageNavButton active"
                : "pageNavButton"
            }
          >
            <span className="pageNumber">
              {String(index + 1).padStart(
                2,
                "0"
              )}
            </span>

            <span>
              {page?.name ||
                `Page ${index + 1}`}
            </span>
          </button>
        ))}
      </div>

      <div className="navFooter">
        <div className="navLine" />

        <span>
          AI GENERATED
        </span>
      </div>
    </aside>
  );
}

/* =========================================================
   PAGE OVERVIEW
========================================================= */

function PageOverview({
  page,
  preview = false,
  created = false,
  onFeature,
}) {
  const normalizedPage =
    page || DEFAULT_PAGE;

  const pageFeatures = Array.isArray(
    normalizedPage.features
  )
    ? normalizedPage.features.map(
        normalizeFeature
      )
    : [];

  const purpose =
    normalizedPage.purpose ||
    normalizedPage.description ||
    "AI generated application page.";

  return (
    <div className="pageOverview">
      <div className="pageHero">
        <div className="heroAccent" />

        <div className="eyebrow">
          {created
            ? "CREATED PAGE"
            : preview
            ? "LIVE PAGE"
            : "PAGE STRUCTURE"}
        </div>

        <h2>
          {normalizedPage.name ||
            "Main"}
        </h2>

        <p>{purpose}</p>
      </div>

      <div className="contentSection">
        <div className="sectionHeader">
          <div>
            <div className="eyebrow">
              PAGE FEATURES
            </div>

            <h3>
              Built around your idea
            </h3>
          </div>

          <div className="countBadge">
            {pageFeatures.length}
          </div>
        </div>

        {pageFeatures.length > 0 ? (
          <div className="featureGrid">
            {pageFeatures.map(
              (feature, index) => (
                <FeatureCard
                  key={`${feature.name}-${index}`}
                  feature={feature}
                  index={index}
                  onClick={onFeature}
                />
              )
            )}
          </div>
        ) : (
          <div className="emptyState">
            <div className="emptyIcon">
              ✦
            </div>

            <h3>
              Application workspace
            </h3>

            <p>
              AI created this page according
              to your application requirements.
            </p>
          </div>
        )}
      </div>

      <div className="purposeCard">
        <div>
          <div className="eyebrow">
            PAGE PURPOSE
          </div>

          <p>{purpose}</p>
        </div>

        <div className="tagList">
          <span>AI Generated</span>
          <span>Customizable</span>
          <span>App Ready</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURES
========================================================= */

function FeatureSection({
  features,
  onFeature,
}) {
  return (
    <section className="contentSection appFeatureSection">
      <div className="sectionHeader">
        <div>
          <div className="eyebrow">
            APPLICATION FEATURES
          </div>

          <h3>
            Across your application
          </h3>
        </div>
      </div>

      <div className="featureGrid">
        {features.map((feature, index) => {
          const item =
            normalizeFeature(feature);

          return (
            <FeatureCard
              key={`${item.name}-${index}`}
              feature={item}
              index={index}
              onClick={onFeature}
            />
          );
        })}
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  onClick,
}) {
  return (
    <article className="featureCard">
      <div className="featureTop">
        <div className="featureIcon">
          ✦
        </div>

        <span className="featureIndex">
          {String(index + 1).padStart(
            2,
            "0"
          )}
        </span>
      </div>

      <h3>{feature.name}</h3>

      <p>{feature.description}</p>

      <button
        className="featureButton"
        onClick={() => onClick(feature)}
      >
        Explore Feature
        <span>→</span>
      </button>
    </article>
  );
}

/* =========================================================
   MODIFY
========================================================= */

function ModifyPanel({
  instruction,
  setInstruction,
  loading,
  message,
  onModify,
}) {
  return (
    <section className="modifyPanel">
      <div className="modifyHeader">
        <div>
          <div className="eyebrow">
            AI MODIFICATION
          </div>

          <h3>
            Shape your application
          </h3>

          <p>
            Tell AI what you want to add,
            remove or improve.
          </p>
        </div>

        <div className="modifyOrb">
          ✦
        </div>
      </div>

      <textarea
        value={instruction}
        onChange={(event) =>
          setInstruction(event.target.value)
        }
        className="modifyInput"
        placeholder="Example: Add a customer dashboard and a booking page..."
      />

      <div className="modifyFooter">
        <div className="modifyStatus">
          {message ? (
            <span className="successText">
              {message}
            </span>
          ) : (
            <span>
              AI will update your application
              structure.
            </span>
          )}
        </div>

        <button
          className="primaryButton"
          onClick={onModify}
          disabled={
            loading ||
            !instruction.trim()
          }
        >
          {loading
            ? "Updating..."
            : "Apply Changes →"}
        </button>
      </div>
    </section>
  );
}

/* =========================================================
   MODAL
========================================================= */

function FeatureModal({
  feature,
  onClose,
}) {
  return (
    <div
      className="modalBackdrop"
      onClick={onClose}
    >
      <div
        className="featureModal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className="modalClose"
          onClick={onClose}
        >
          ×
        </button>

        <div className="modalIcon">
          ✦
        </div>

        <div className="eyebrow">
          AI GENERATED FEATURE
        </div>

        <h2>{feature.name}</h2>

        <p>{feature.description}</p>

        <div className="modalTags">
          <span>AI Generated</span>
          <span>Customizable</span>
          <span>App Ready</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GLOBAL STYLES
========================================================= */

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

        background: #061c19;
        color: #f3fbf7;
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
        opacity: 0.5;
      }

      textarea {
        outline: none;
      }

      .app {
        position: relative;
        min-height: 100vh;
        min-height: 100svh;
        overflow-x: hidden;
        background:
          radial-gradient(
            circle at 50% -10%,
            rgba(91, 207, 168, 0.15),
            transparent 38%
          ),
          radial-gradient(
            circle at 90% 65%,
            rgba(36, 148, 132, 0.1),
            transparent 30%
          ),
          linear-gradient(
            180deg,
            #061b18 0%,
            #082a24 48%,
            #041b19 100%
          );
      }

      .pageLayer {
        position: relative;
        z-index: 5;
        width: min(
          1380px,
          calc(100% - 48px)
        );
        margin: 0 auto;
      }

      /* BACKGROUND */

      .background {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }

      .backgroundGlow {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
      }

      .glowOne {
        width: 480px;
        height: 480px;
        top: -260px;
        left: 12%;
        background: rgba(
          54,
          180,
          141,
          0.14
        );
      }

      .glowTwo {
        width: 420px;
        height: 420px;
        right: -200px;
        top: 30%;
        background: rgba(
          29,
          137,
          125,
          0.12
        );
      }

      .glowThree {
        width: 500px;
        height: 300px;
        bottom: -150px;
        left: 25%;
        background: rgba(
          34,
          112,
          101,
          0.15
        );
      }

      .waterSurface {
        position: absolute;
        left: -10%;
        right: -10%;
        bottom: -18%;
        height: 45%;
        opacity: 0.6;
        transform: perspective(900px)
          rotateX(58deg);
        transform-origin: center top;
        background:
          linear-gradient(
            180deg,
            rgba(27, 121, 112, 0.2),
            rgba(3, 40, 38, 0.1)
          );
      }

      .waterLine {
        position: absolute;
        left: 10%;
        right: 10%;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(104, 215, 191, 0.12),
          transparent
        );
      }

      .lineOne {
        top: 20%;
      }

      .lineTwo {
        top: 38%;
      }

      .lineThree {
        top: 57%;
      }

      .lineFour {
        top: 76%;
      }

      .goldLight {
        position: absolute;
        width: 280px;
        height: 280px;
        right: 12%;
        top: 8%;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(222, 191, 119, 0.1),
          transparent 68%
        );
        filter: blur(12px);
      }

      .gridPattern {
        position: absolute;
        inset: 0;
        opacity: 0.08;
        background-image:
          linear-gradient(
            rgba(157, 220, 199, 0.08) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(157, 220, 199, 0.08) 1px,
            transparent 1px
          );
        background-size: 80px 80px;
        mask-image: linear-gradient(
          to bottom,
          black,
          transparent 70%
        );
      }

      .vignette {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(
            circle at center,
            transparent 20%,
            rgba(1, 14, 12, 0.5) 100%
          );
      }

      /* HEADER */

      .header {
        min-height: 92px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .logoArea {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logoMark {
        width: 43px;
        height: 43px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        border: 1px solid
          rgba(126, 226, 194, 0.2);
        background:
          linear-gradient(
            145deg,
            rgba(44, 144, 112, 0.7),
            rgba(7, 56, 47, 0.8)
          );
        box-shadow:
          0 12px 40px
            rgba(0, 0, 0, 0.25),
          inset 0 1px 0
            rgba(255, 255, 255, 0.12);
        color: #d5f5e7;
      }

      .logoName {
        font-size: 13px;
        font-weight: 850;
        letter-spacing: 0.18em;
      }

      .logoTagline {
        margin-top: 3px;
        color: #759b8e;
        font-size: 10px;
      }

      .headerRight {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .aiIndicator,
      .createdStatus {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 13px;
        border-radius: 999px;
        border: 1px solid
          rgba(118, 218, 185, 0.14);
        background: rgba(
          5,
          36,
          30,
          0.65
        );
        color: #a6d8c4;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: 0.03em;
      }

      .statusDot {
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        border-radius: 50%;
        background: #72d9b1;
        box-shadow:
          0 0 0 5px
            rgba(114, 217, 177, 0.08),
          0 0 16px
            rgba(114, 217, 177, 0.5);
      }

      .headerNew {
        border: 1px solid
          rgba(125, 222, 192, 0.13);
        background: rgba(
          255,
          255,
          255,
          0.035
        );
        color: #a5c7bb;
        padding: 9px 13px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 750;
      }

      .headerNew:hover {
        background: rgba(
          102,
          213,
          176,
          0.08
        );
        color: #e4fff5;
      }

      /* HOME */

      .homeScreen {
        max-width: 950px;
        margin: 0 auto;
        padding: 6vh 0 30px;
        text-align: center;
      }

      .heroOrb {
        position: relative;
        width: 112px;
        height: 112px;
        margin: 0 auto 28px;
        display: grid;
        place-items: center;
      }

      .orbCore {
        width: 68px;
        height: 68px;
        display: grid;
        place-items: center;
        border-radius: 23px;
        border: 1px solid
          rgba(177, 240, 218, 0.3);
        background:
          radial-gradient(
            circle at 30% 20%,
            #a1efd0,
            #2c9b78 40%,
            #0a4033 75%
          );
        box-shadow:
          0 0 55px
            rgba(70, 203, 155, 0.22),
          0 20px 55px
            rgba(0, 0, 0, 0.3),
          inset 0 1px 0
            rgba(255, 255, 255, 0.18);
        color: #f1fff9;
        font-size: 26px;
        z-index: 2;
      }

      .orbOuter {
        position: absolute;
        border: 1px solid
          rgba(103, 221, 183, 0.18);
        border-radius: 50%;
      }

      .outerOne {
        inset: 8px;
        animation: rotate 15s linear infinite;
      }

      .outerTwo {
        inset: -6px;
        border-style: dashed;
        opacity: 0.45;
        animation: rotateReverse 21s linear
          infinite;
      }

      @keyframes rotate {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes rotateReverse {
        to {
          transform: rotate(-360deg);
        }
      }

      .eyebrow {
        color: #70cda8;
        font-size: 9px;
        font-weight: 850;
        letter-spacing: 0.21em;
        text-transform: uppercase;
      }

      .center {
        text-align: center;
      }

      .heroTitle {
        margin: 13px auto 18px;
        font-size: clamp(
          52px,
          8vw,
          88px
        );
        line-height: 0.94;
        letter-spacing: -0.065em;
        font-weight: 850;
      }

      .heroTitle span {
        display: block;
        color: #91e4bf;
        text-shadow:
          0 0 50px
            rgba(80, 205, 157, 0.17);
      }

      .heroDescription {
        max-width: 650px;
        margin: 0 auto 32px;
        color: #8eafa4;
        font-size: 15px;
        line-height: 1.75;
      }

      .ideaPanel {
        padding: 9px;
        text-align: left;
        border-radius: 25px;
        border: 1px solid
          rgba(128, 224, 193, 0.15);
        background: rgba(
          3,
          29,
          24,
          0.78
        );
        box-shadow:
          0 30px 100px
            rgba(0, 0, 0, 0.32),
          inset 0 1px 0
            rgba(255, 255, 255, 0.035);
        backdrop-filter: blur(22px);
      }

      .ideaInput {
        width: 100%;
        min-height: 165px;
        resize: vertical;
        border: 0;
        background: transparent;
        color: #effaf5;
        padding: 21px;
        font-size: 15px;
        line-height: 1.65;
      }

      .ideaInput::placeholder {
        color: #587b70;
      }

      .ideaFooter {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 11px;
        border-top: 1px solid
          rgba(125, 224, 193, 0.08);
      }

      .characterCount {
        color: #557c70;
        font-size: 10px;
      }

      .generateButton,
      .primaryButton {
        border: 0;
        border-radius: 12px;
        padding: 13px 18px;
        color: #062119;
        background:
          linear-gradient(
            135deg,
            #b3f0d5,
            #63cea2
          );
        font-weight: 850;
        box-shadow:
          0 12px 32px
            rgba(70, 201, 152, 0.16);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .generateButton:hover,
      .primaryButton:hover {
        transform: translateY(-2px);
        box-shadow:
          0 18px 42px
            rgba(70, 201, 152, 0.23);
      }

      .arrow {
        margin-left: 9px;
      }

      .spinner {
        display: inline-block;
        width: 13px;
        height: 13px;
        margin-right: 8px;
        vertical-align: -2px;
        border-radius: 50%;
        border: 2px solid
          rgba(6, 33, 25, 0.25);
        border-top-color: #062119;
        animation: rotate 0.8s linear infinite;
      }

      .errorMessage {
        max-width: 760px;
        margin: 14px auto 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        text-align: left;
        border-radius: 12px;
        color: #ffd0ca;
        background: rgba(
          103,
          29,
          27,
          0.45
        );
        border: 1px solid
          rgba(255, 128, 117, 0.15);
        font-size: 11px;
      }

      .errorMessage span {
        width: 21px;
        height: 21px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #9b3e37;
      }

      .generationStatus {
        max-width: 600px;
        margin: 18px auto 0;
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 15px;
        text-align: left;
        border-radius: 17px;
        background: rgba(
          7,
          46,
          37,
          0.7
        );
        border: 1px solid
          rgba(116, 218, 183, 0.12);
      }

      .statusIcon {
        width: 43px;
        height: 43px;
        display: grid;
        place-items: center;
        flex: 0 0 43px;
        border-radius: 14px;
        color: #9ce7c5;
        background: rgba(
          65,
          180,
          138,
          0.13
        );
        animation: breathe 1.5s ease-in-out
          infinite;
      }

      @keyframes breathe {
        50% {
          transform: scale(1.07);
          box-shadow:
            0 0 30px
              rgba(76, 205, 158, 0.16);
        }
      }

      .generationStatus strong {
        font-size: 12px;
      }

      .generationStatus p {
        margin: 4px 0 0;
        color: #6e9689;
        font-size: 10px;
        line-height: 1.5;
      }

      .processCards {
        max-width: 820px;
        margin: 55px auto 0;
        display: grid;
        grid-template-columns: repeat(
          3,
          1fr
        );
        gap: 12px;
      }

      .processCard {
        padding: 17px;
        text-align: left;
        border-radius: 17px;
        border: 1px solid
          rgba(120, 220, 187, 0.09);
        background: rgba(
          7,
          43,
          35,
          0.48
        );
        backdrop-filter: blur(12px);
      }

      .processTop {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .processIcon {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        color: #91dfbb;
        background: rgba(
          67,
          178,
          136,
          0.11
        );
      }

      .processTop > span {
        color: #3f675c;
        font-size: 9px;
        font-weight: 800;
      }

      .processCard strong {
        font-size: 12px;
      }

      .processCard p {
        margin: 5px 0 0;
        color: #658b7f;
        font-size: 10px;
        line-height: 1.5;
      }

      .homeBottom {
        margin-top: 58px;
        display: flex;
        justify-content: space-between;
        color: #41655b;
        font-size: 8px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      /* WORKSPACE */

      .workspaceScreen {
        padding: 38px 0 70px;
      }

      .workspaceIntro,
      .topBar,
      .createdHeader {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 25px;
        margin-bottom: 25px;
      }

      .workspaceIntro h1,
      .topBar h1,
      .createdHeader h1 {
        margin: 8px 0 7px;
        font-size: clamp(
          30px,
          4vw,
          46px
        );
        line-height: 1;
        letter-spacing: -0.05em;
      }

      .workspaceIntro p,
      .createdHeader p {
        max-width: 650px;
        margin: 0;
        color: #7e9f94;
        font-size: 12px;
        line-height: 1.65;
      }

      .introActions,
      .topBarActions {
        display: flex;
        align-items: center;
        gap: 9px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .secondaryButton {
        border: 1px solid
          rgba(126, 222, 191, 0.13);
        background: rgba(
          255,
          255,
          255,
          0.035
        );
        color: #9abaae;
        border-radius: 11px;
        padding: 11px 14px;
        font-size: 10px;
        font-weight: 750;
      }

      .secondaryButton:hover {
        color: #e3fff4;
        background: rgba(
          91,
          202,
          165,
          0.07
        );
      }

      .workspaceGrid {
        display: grid;
        grid-template-columns: 245px minmax(
            0,
            1fr
          );
        gap: 18px;
        align-items: start;
      }

      .pageNavigation {
        position: sticky;
        top: 20px;
        min-width: 0;
        padding: 21px;
        border-radius: 21px;
        border: 1px solid
          rgba(121, 222, 190, 0.12);
        background: rgba(
          4,
          32,
          26,
          0.76
        );
        backdrop-filter: blur(20px);
      }

      .navEyebrow {
        color: #5f8b7e;
        font-size: 8px;
        font-weight: 850;
        letter-spacing: 0.18em;
      }

      .navTitle {
        margin: 6px 0 18px;
        font-size: 18px;
        font-weight: 800;
      }

      .desktopPageList {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .pageNavButton {
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        text-align: left;
        color: #7fa498;
        border: 1px solid transparent;
        background: transparent;
        border-radius: 11px;
        font-size: 11px;
      }

      .pageNavButton:hover {
        background: rgba(
          91,
          202,
          165,
          0.06
        );
      }

      .pageNavButton.active {
        color: #edfff7;
        border-color:
          rgba(121, 224, 191, 0.12);
        background:
          linear-gradient(
            135deg,
            rgba(28, 113, 84, 0.8),
            rgba(10, 65, 54, 0.8)
          );
      }

      .pageNumber {
        width: 25px;
        height: 25px;
        display: grid;
        place-items: center;
        flex: 0 0 25px;
        border-radius: 8px;
        color: #6aa38e;
        background: rgba(
          255,
          255,
          255,
          0.045
        );
        font-size: 8px;
      }

      .navFooter {
        margin-top: 26px;
      }

      .navLine {
        height: 1px;
        margin-bottom: 12px;
        background: rgba(
          120,
          218,
          188,
          0.07
        );
      }

      .navFooter span {
        color: #3f655a;
        font-size: 7px;
        letter-spacing: 0.15em;
      }

      .workspaceMain {
        min-width: 0;
      }

      .pageOverview {
        min-width: 0;
      }

      /* PAGE HERO */

      .pageHero {
        position: relative;
        overflow: hidden;
        padding: 29px;
        margin-bottom: 22px;
        border-radius: 23px;
        border: 1px solid
          rgba(123, 223, 191, 0.12);
        background:
          linear-gradient(
            135deg,
            rgba(13, 76, 60, 0.74),
            rgba(4, 31, 25, 0.86)
          );
      }

      .heroAccent {
        position: absolute;
        width: 250px;
        height: 250px;
        right: -90px;
        top: -120px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(87, 213, 163, 0.15),
          transparent 68%
        );
        filter: blur(10px);
      }

      .pageHero h2 {
        position: relative;
        margin: 10px 0 8px;
        font-size: clamp(
          27px,
          4vw,
          40px
        );
        line-height: 1;
        letter-spacing: -0.045em;
      }

      .pageHero p {
        position: relative;
        max-width: 720px;
        margin: 0;
        color: #95b5aa;
        font-size: 12px;
        line-height: 1.7;
      }

      /* CONTENT */

      .contentSection {
        margin-bottom: 22px;
      }

      .sectionHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 12px;
      }

      .sectionHeader h3 {
        margin: 5px 0 0;
        font-size: 17px;
        letter-spacing: -0.025em;
      }

      .countBadge {
        min-width: 31px;
        height: 27px;
        display: grid;
        place-items: center;
        padding: 0 9px;
        border-radius: 999px;
        color: #a3dec5;
        background: rgba(
          72,
          181,
          140,
          0.09
        );
        border: 1px solid
          rgba(116, 220, 184, 0.1);
        font-size: 9px;
        font-weight: 850;
      }

      .featureGrid {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(205px, 1fr)
        );
        gap: 11px;
      }

      .featureCard {
        min-width: 0;
        padding: 17px;
        border-radius: 17px;
        border: 1px solid
          rgba(119, 220, 188, 0.09);
        background: rgba(
          5,
          35,
          28,
          0.68
        );
        backdrop-filter: blur(12px);
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          background 0.2s ease;
      }

      .featureCard:hover {
        transform: translateY(-3px);
        border-color:
          rgba(119, 220, 188, 0.18);
        background: rgba(
          8,
          47,
          38,
          0.78
        );
      }

      .featureTop {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .featureIcon,
      .emptyIcon,
      .modalIcon {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        color: #9de7c5;
        background: rgba(
          68,
          181,
          138,
          0.11
        );
      }

      .featureIndex {
        color: #42695d;
        font-size: 9px;
        font-weight: 850;
      }

      .featureCard h3 {
        margin: 19px 0 7px;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .featureCard p {
        min-height: 48px;
        margin: 0 0 15px;
        color: #719489;
        font-size: 10px;
        line-height: 1.65;
        overflow-wrap: anywhere;
      }

      .featureButton {
        border: 0;
        padding: 0;
        color: #89c5ad;
        background: transparent;
        font-size: 9px;
        font-weight: 800;
      }

      .featureButton span {
        margin-left: 6px;
      }

      .featureButton:hover {
        color: #c4f2df;
      }

      .emptyState {
        padding: 25px;
        border-radius: 18px;
        border: 1px solid
          rgba(119, 220, 188, 0.08);
        background: rgba(
          5,
          32,
          27,
          0.62
        );
      }

      .emptyState h3 {
        margin: 14px 0 5px;
        font-size: 14px;
      }

      .emptyState p {
        margin: 0;
        color: #719489;
        font-size: 10px;
        line-height: 1.6;
      }

      .purposeCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
        padding: 20px;
        border-radius: 18px;
        border: 1px solid
          rgba(119, 220, 188, 0.08);
        background: rgba(
          5,
          32,
          27,
          0.62
        );
      }

      .purposeCard p {
        max-width: 650px;
        margin: 7px 0 0;
        color: #799b90;
        font-size: 10px;
        line-height: 1.65;
      }

      .tagList,
      .modalTags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .tagList span,
      .modalTags span {
        padding: 6px 8px;
        border-radius: 999px;
        color: #72a895;
        border: 1px solid
          rgba(119, 220, 188, 0.08);
        background: rgba(
          119,
          220,
          188,
          0.04
        );
        font-size: 8px;
      }

      /* MODIFY */

      .modifyPanel {
        padding: 21px;
        border-radius: 20px;
        border: 1px solid
          rgba(128, 224, 193, 0.12);
        background:
          linear-gradient(
            135deg,
            rgba(11, 69, 53, 0.65),
            rgba(4, 29, 24, 0.8)
          );
      }

      .modifyHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
      }

      .modifyHeader h3 {
        margin: 5px 0 4px;
        font-size: 16px;
      }

      .modifyHeader p {
        margin: 0;
        color: #71968a;
        font-size: 10px;
      }

      .modifyOrb {
        width: 39px;
        height: 39px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        color: #b6efd6;
        background:
          radial-gradient(
            circle at 30% 20%,
            #6ed1a7,
            #185b46
          );
        border: 1px solid
          rgba(164, 240, 213, 0.2);
      }

      .modifyInput {
        width: 100%;
        min-height: 100px;
        margin-top: 13px;
        resize: vertical;
        border: 1px solid
          rgba(124, 221, 190, 0.08);
        border-radius: 13px;
        background: rgba(
          0,
          0,
          0,
          0.13
        );
        color: #edf9f4;
        padding: 14px;
        font-size: 11px;
        line-height: 1.6;
      }

      .modifyInput::placeholder {
        color: #5b7d72;
      }

      .modifyFooter {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-top: 10px;
      }

      .modifyStatus {
        min-width: 0;
        color: #5e8378;
        font-size: 9px;
      }

      .successText {
        color: #81d9b1;
      }

      /* MOBILE NAV */

      .mobilePageNav {
        display: none;
        gap: 7px;
        overflow-x: auto;
        padding-bottom: 12px;
        scrollbar-width: none;
      }

      .mobilePageNav::-webkit-scrollbar {
        display: none;
      }

      .mobilePage {
        flex: 0 0 auto;
        padding: 8px 12px;
        white-space: nowrap;
        border-radius: 999px;
        border: 1px solid
          rgba(122, 221, 190, 0.1);
        background: rgba(
          5,
          31,
          26,
          0.75
        );
        color: #739a8d;
        font-size: 9px;
      }

      .mobilePage.active {
        color: #edfff7;
        background: #176f54;
        border-color:
          rgba(145, 236, 199, 0.15);
      }

      /* CREATED */

      .createdStatus {
        width: fit-content;
        margin-bottom: 7px;
        color: #8fe1ba;
      }

      .createdHeader p {
        color: #75988d;
      }

      /* MODAL */

      .modalBackdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(
          1,
          12,
          10,
          0.78
        );
        backdrop-filter: blur(13px);
      }

      .featureModal {
        position: relative;
        width: min(520px, 100%);
        padding: 30px;
        border-radius: 23px;
        border: 1px solid
          rgba(129, 226, 193, 0.16);
        background:
          linear-gradient(
            145deg,
            #0b392d,
            #051e19
          );
        box-shadow:
          0 35px 110px
            rgba(0, 0, 0, 0.55);
      }

      .modalClose {
        position: absolute;
        top: 13px;
        right: 13px;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 10px;
        color: #8bad9f;
        background: rgba(
          255,
          255,
          255,
          0.045
        );
        font-size: 21px;
      }

      .featureModal h2 {
        margin: 13px 0 9px;
        font-size: 27px;
        letter-spacing: -0.04em;
        overflow-wrap: anywhere;
      }

      .featureModal > p {
        margin: 0;
        color: #83a59a;
        font-size: 12px;
        line-height: 1.75;
      }

      .modalTags {
        margin-top: 20px;
      }

      /* TABLET */

      @media (max-width: 900px) {
        .workspaceGrid {
          grid-template-columns: 1fr;
        }

        .pageNavigation {
          position: static;
        }

        .desktopPageList {
          display: none;
        }

        .navFooter {
          display: none;
        }

        .mobilePageNav {
          display: flex;
        }

        .workspaceIntro,
        .topBar,
        .createdHeader {
          align-items: flex-start;
          flex-direction: column;
        }

        .introActions,
        .topBarActions {
          justify-content: flex-start;
        }

        .purposeCard {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      /* PHONE */

      @media (max-width: 680px) {
        .pageLayer {
          width: calc(100% - 22px);
        }

        .header {
          min-height: 72px;
        }

        .logoMark {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
          border-radius: 11px;
        }

        .logoName {
          font-size: 9px;
          letter-spacing: 0.13em;
        }

        .logoTagline {
          font-size: 8px;
        }

        .headerRight {
          gap: 5px;
        }

        .headerNew,
        .aiIndicator {
          padding: 7px 9px;
          font-size: 8px;
        }

        .homeScreen {
          padding-top: 4vh;
        }

        .heroOrb {
          transform: scale(0.82);
          margin-bottom: 17px;
        }

        .heroTitle {
          font-size: clamp(
            46px,
            14vw,
            64px
          );
        }

        .heroDescription {
          padding: 0 8px;
          font-size: 12px;
          line-height: 1.7;
        }

        .ideaPanel {
          border-radius: 19px;
        }

        .ideaInput {
          min-height: 140px;
          padding: 15px;
          font-size: 13px;
        }

        .ideaFooter {
          align-items: stretch;
          flex-direction: column;
        }

        .characterCount {
          padding: 0 3px;
        }

        .generateButton {
          width: 100%;
        }

        .processCards {
          grid-template-columns: 1fr;
          margin-top: 32px;
        }

        .homeBottom {
          margin-top: 38px;
          align-items: center;
          flex-direction: column;
          gap: 7px;
        }

        .workspaceScreen {
          padding-top: 23px;
        }

        .workspaceIntro h1,
        .topBar h1,
        .createdHeader h1 {
          font-size: 31px;
        }

        .workspaceIntro p,
        .createdHeader p {
          font-size: 10px;
        }

        .introActions,
        .topBarActions {
          width: 100%;
        }

        .introActions button,
        .topBarActions button {
          flex: 1;
        }

        .pageNavigation {
          padding: 16px;
          border-radius: 17px;
        }

        .pageHero {
          padding: 21px;
          border-radius: 18px;
        }

        .pageHero h2 {
          font-size: 28px;
        }

        .pageHero p {
          font-size: 11px;
        }

        .featureGrid {
          grid-template-columns: 1fr;
        }

        .featureCard {
          padding: 16px;
        }

        .purposeCard,
        .modifyPanel,
        .emptyState {
          padding: 17px;
          border-radius: 17px;
        }

        .modifyFooter {
          align-items: stretch;
          flex-direction: column;
        }

        .modifyFooter .primaryButton {
          width: 100%;
        }

        .goldLight {
          right: -100px;
          top: 10%;
        }

        .waterSurface {
          bottom: -12%;
          height: 38%;
        }
      }

      @media (max-width: 420px) {
        .pageLayer {
          width: calc(100% - 16px);
        }

        .logoTagline {
          display: none;
        }

        .aiIndicator span:last-child {
          display: none;
        }

        .heroTitle {
          font-size: 45px;
        }

        .heroDescription {
          font-size: 11px;
        }

        .workspaceIntro h1,
        .topBar h1,
        .createdHeader h1 {
          font-size: 28px;
        }

        .pageHero h2 {
          font-size: 25px;
        }

        .sectionHeader h3 {
          font-size: 15px;
        }
      }
    `}</style>
  );
}
