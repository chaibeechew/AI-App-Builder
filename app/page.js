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
    if (!idea.trim()) return;

    setLoading(true);
    setError("");
    setPlan(null);
    setPreview(false);
    setCreated(false);
    setActivePage("");

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
        throw new Error(data?.error || "Generation failed");
      }

      if (!data?.specification) {
        throw new Error("AI did not return a valid specification.");
      }

      setPlan(data);
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
        name: "Dashboard",
        purpose: "Main overview of your application.",
      },
    ];
  }

  function getFeatures() {
    const features = plan?.specification?.features;

    if (Array.isArray(features)) {
      return features;
    }

    return [];
  }

  function continueToPreview() {
    const pages = getPages();

    setPreview(true);
    setCreated(false);
    setActiveFeature(null);
    setActivePage(pages[0]?.name || "Dashboard");
    setModifyMessage("");
  }

  function createApp() {
    const pages = getPages();

    setCreated(true);
    setActivePage(pages[0]?.name || "Dashboard");
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
    setActivePage(page.name);
    setActiveFeature(null);
  }

  function openFeature(feature) {
    setActiveFeature(feature);
  }

  function closeFeature() {
    setActiveFeature(null);
  }

  async function modifyApp() {
    if (!modifyInstruction.trim()) return;

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
        throw new Error(data?.error || "Modification failed");
      }

      if (!data?.specification) {
        throw new Error(
          "AI did not return a valid app specification."
        );
      }

      setPlan((current) => ({
        ...current,
        specification: data.specification,
      }));

      const pages = data.specification.pages || [];

      setActivePage(pages[0]?.name || "Dashboard");
      setModifyInstruction("");
      setModifyMessage("✓ Changes applied successfully.");
    } catch (err) {
      setModifyMessage(
        err?.message || "Something went wrong."
      );
    } finally {
      setModifyLoading(false);
    }
  }

  function renderGeneratedPage(page) {
    const pageName = String(page?.name || "Application Page");
    const purpose =
      page?.purpose ||
      page?.description ||
      "This page was generated according to your app requirements.";

    const pageFeatures = Array.isArray(page?.features)
      ? page.features
      : [];

    return (
      <>
        <PageHeader
          title={pageName}
          description={purpose}
        />

        <div style={pageHero}>
          <div>
            <div style={smallLabel}>AI GENERATED PAGE</div>

            <h2 style={heroTitle}>{pageName}</h2>

            <p style={heroDescription}>
              {purpose}
            </p>
          </div>
        </div>

        {pageFeatures.length > 0 ? (
          <>
            <h3 style={sectionTitle}>
              Page Features
            </h3>

            <div style={featureGrid}>
              {pageFeatures.map((feature, index) => {
                const featureObject =
                  typeof feature === "string"
                    ? {
                        name: feature,
                        description:
                          "Feature generated from your app requirements.",
                      }
                    : feature;

                return (
                  <div
                    key={`${featureObject.name}-${index}`}
                    style={cardStyle}
                  >
                    <div style={featureIcon}>
                      ✦
                    </div>

                    <h3>
                      {featureObject.name ||
                        `Feature ${index + 1}`}
                    </h3>

                    <p style={mutedText}>
                      {featureObject.description ||
                        "AI generated application feature."}
                    </p>

                    <button
                      onClick={() =>
                        openFeature(featureObject)
                      }
                      style={{
                        ...secondaryButtonStyle,
                        marginTop: 10,
                      }}
                    >
                      Open Feature →
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <div style={featureIcon}>✦</div>

              <h3>AI Workspace</h3>

              <p style={mutedText}>
                This page was generated specifically from
                the customer's requirements.
              </p>

              <button
                onClick={() =>
                  openFeature({
                    name: pageName,
                    description: purpose,
                  })
                }
                style={{
                  ...secondaryButtonStyle,
                  marginTop: 12,
                }}
              >
                Open →
              </button>
            </div>

            <div style={cardStyle}>
              <div style={featureIcon}>⚡</div>

              <h3>Customize with AI</h3>

              <p style={mutedText}>
                Tell AI what you want to add, remove or
                change on this page.
              </p>

              <button
                onClick={() =>
                  setModifyInstruction(
                    `Improve the ${pageName} page based on my app requirements.`
                  )
                }
                style={{
                  ...buttonStyle,
                  marginTop: 12,
                }}
              >
                Modify with AI
              </button>
            </div>
          </div>
        )}

        <div style={cardStyleLarge}>
          <h3>About this page</h3>

          <p style={paragraphText}>
            {purpose}
          </p>

          <div style={generatedInfo}>
            <span>Generated from customer requirements</span>
            <span>AI powered</span>
            <span>Ready to customize</span>
          </div>
        </div>
      </>
    );
  }

  function renderCreatedApp() {
    const specification = plan?.specification || {};
    const pages = getPages();

    const currentPage =
      pages.find(
        (page) => page.name === activePage
      ) || pages[0];

    return (
      <main style={appShell}>
        <div style={appContainer}>
          <header style={topHeader}>
            <div>
              <div style={smallBrand}>
                AI APP BUILDER
              </div>

              <h1 style={appTitle}>
                {specification.name || "My App"}
              </h1>

              <p style={headerSubtitle}>
                {specification.description ||
                  "Your AI-generated application"}
              </p>
            </div>

            <div style={buttonRow}>
              <span style={successBadgeStyle}>
                ✓ App Created
              </span>

              <button
                onClick={backToPreview}
                style={secondaryButtonStyle}
              >
                Back to Preview
              </button>
            </div>
          </header>

          <div style={appLayout}>
            <aside style={sidebar}>
              <div style={sidebarHeader}>
                <div style={sidebarTitle}>
                  PAGES
                </div>

                <div style={pageCount}>
                  {pages.length}
                </div>
              </div>

              <div>
                {pages.map((page, index) => (
                  <button
                    key={`${page.name}-${index}`}
                    onClick={() =>
                      selectPage(page)
                    }
                    style={{
                      ...sidebarButton,
                      background:
                        activePage === page.name
                          ? "linear-gradient(135deg,#166534,#0f766e)"
                          : "transparent",
                      color:
                        activePage === page.name
                          ? "#ffffff"
                          : "#374151",
                      boxShadow:
                        activePage === page.name
                          ? "0 5px 15px rgba(22,101,52,0.18)"
                          : "none",
                    }}
                  >
                    <span style={pageNumber}>
                      {index + 1}
                    </span>

                    <span>
                      {page.name}
                    </span>
                  </button>
                ))}
              </div>

              <div style={sidebarBottom}>
                <button
                  onClick={goBackToPlan}
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                  }}
                >
                  ← Back to Plan
                </button>
              </div>
            </aside>

            <section style={contentArea}>
              {currentPage
                ? renderGeneratedPage(currentPage)
                : null}

              <div style={modifyPanel}>
                <div style={smallLabel}>
                  AI APP MODIFIER
                </div>

                <h3>
                  Change your app
                </h3>

                <p style={mutedText}>
                  Describe what you want to add,
                  remove or change.
                </p>

                <textarea
                  value={modifyInstruction}
                  onChange={(e) =>
                    setModifyInstruction(
                      e.target.value
                    )
                  }
                  placeholder="Example: Add a customer booking page with WhatsApp contact and payment options..."
                  style={modifyTextarea}
                />

                <button
                  onClick={modifyApp}
                  disabled={
                    modifyLoading ||
                    !modifyInstruction.trim()
                  }
                  style={{
                    ...buttonStyle,
                    marginTop: 12,
                    opacity:
                      modifyLoading ||
                      !modifyInstruction.trim()
                        ? 0.5
                        : 1,
                  }}
                >
                  {modifyLoading
                    ? "Updating App..."
                    : "Modify with AI →"}
                </button>

                {modifyMessage && (
                  <div style={modifyMessageStyle}>
                    {modifyMessage}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {activeFeature && (
          <FeatureModal
            feature={activeFeature}
            onClose={closeFeature}
          />
        )}
      </main>
    );
  }

  if (preview && plan?.specification) {
    const specification = plan.specification;
    const pages = getPages();
    const features = getFeatures();

    return (
      <main style={previewShell}>
        <div style={previewLayout}>
          <aside style={previewSidebar}>
            <div style={smallBrand}>
              AI APP BUILDER
            </div>

            <h2 style={previewAppName}>
              {specification.name ||
                "My App"}
            </h2>

            <p style={headerSubtitle}>
              Interactive App Preview
            </p>

            <div style={previewSectionLabel}>
              APP PAGES
            </div>

            {pages.map((page, index) => (
              <button
                key={`${page.name}-${index}`}
                onClick={() =>
                  selectPage(page)
                }
                style={{
                  ...sidebarButton,
                  marginTop: 7,
                  background:
                    activePage === page.name
                      ? "linear-gradient(135deg,#166534,#0f766e)"
                      : "transparent",
                  color:
                    activePage === page.name
                      ? "#fff"
                      : "#374151",
                }}
              >
                <span style={pageNumber}>
                  {index + 1}
                </span>

                {page.name}
              </button>
            ))}

            <button
              onClick={goBackToPlan}
              style={{
                ...secondaryButtonStyle,
                width: "100%",
                marginTop: 25,
              }}
            >
              ← Back to Plan
            </button>

            <button
              onClick={createApp}
              style={{
                ...buttonStyle,
                width: "100%",
                marginTop: 10,
              }}
            >
              Confirm & Create App →
            </button>
          </aside>

          <section style={previewContent}>
            <div style={previewTop}>
              <div>
                <div style={smallLabel}>
                  LIVE PREVIEW
                </div>

                <h1 style={{ margin: "8px 0 0" }}>
                  {activePage}
                </h1>
              </div>

              <span style={previewBadge}>
                {pages.length} Pages
              </span>
            </div>

            {pages.map((page) => {
              if (page.name !== activePage) {
                return null;
              }

              return (
                <div key={page.name}>
                  <div style={previewHero}>
                    <div style={smallLabel}>
                      {specification.name ||
                        "YOUR APP"}
                    </div>

                    <h2>
                      {page.name}
                    </h2>

                    <p>
                      {page.purpose ||
                        "AI generated application page."}
                    </p>

                    <button
                      onClick={() =>
                        openFeature({
                          name: page.name,
                          description:
                            page.purpose ||
                            "Application page",
                        })
                      }
                      style={{
                        ...buttonStyle,
                        marginTop: 10,
                      }}
                    >
                      Open Page →
                    </button>
                  </div>
                </div>
              );
            })}

            {features.length > 0 && (
              <>
                <h3 style={sectionTitle}>
                  App Features
                </h3>

                <div style={featureGrid}>
                  {features.map(
                    (feature, index) => {
                      const item =
                        typeof feature ===
                        "string"
                          ? {
                              name: feature,
                              description:
                                "AI generated feature.",
                            }
                          : feature;

                      return (
                        <div
                          key={`${item.name}-${index}`}
                          style={cardStyle}
                        >
                          <div
                            style={
                              featureIcon
                            }
                          >
                            ✦
                          </div>

                          <h3>
                            {item.name}
                          </h3>

                          <p
                            style={
                              mutedText
                            }
                          >
                            {item.description}
                          </p>

                          <button
                            onClick={() =>
                              openFeature(
                                item
                              )
                            }
                            style={
                              secondaryButtonStyle
                            }
                          >
                            Open
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              </>
            )}

            <div style={modifyPanel}>
              <div style={smallLabel}>
                MODIFY
              </div>

              <h3>
                Want to change something?
              </h3>

              <p style={mutedText}>
                Your app can be modified according
                to your requirements.
              </p>

              <textarea
                value={modifyInstruction}
                onChange={(e) =>
                  setModifyInstruction(
                    e.target.value
                  )
                }
                placeholder="Example: Add a payment page..."
                style={modifyTextarea}
              />

              <button
                onClick={modifyApp}
                disabled={
                  modifyLoading ||
                  !modifyInstruction.trim()
                }
                style={{
                  ...buttonStyle,
                  marginTop: 12,
                  opacity:
                    modifyLoading ||
                    !modifyInstruction.trim()
                      ? 0.5
                      : 1,
                }}
              >
                {modifyLoading
                  ? "Updating..."
                  : "Modify with AI →"}
              </button>

              {modifyMessage && (
                <div
                  style={
                    modifyMessageStyle
                  }
                >
                  {modifyMessage}
                </div>
              )}
            </div>
          </section>
        </div>

        {activeFeature && (
          <FeatureModal
            feature={activeFeature}
            onClose={closeFeature}
          />
        )}
      </main>
    );
  }

  return (
    <main style={homeShell}>
      <div style={homeContainer}>
        <div style={homeTop}>
          <div style={brandLabel}>
            AI APP BUILDER
          </div>

          <div style={languageBadge}>
            AI-Powered
          </div>
        </div>

        <h1 style={homeTitle}>
          Turn your idea into a working app.
        </h1>

        <p style={homeDescription}>
          Describe what you want to build.
          AI will understand your requirements
          and create the pages, features and
          structure for your application.
        </p>

        <div style={ideaCard}>
          <div style={smallLabel}>
            YOUR APP IDEA
          </div>

          <textarea
            value={idea}
            onChange={(e) =>
              setIdea(e.target.value)
            }
            placeholder="Example: Create a real estate CRM for Malaysian property agents with clients, property listings, appointments, follow-ups and deal pipeline..."
            style={homeTextarea}
          />

          <button
            onClick={generateApp}
            disabled={
              loading || !idea.trim()
            }
            style={{
              ...primaryLargeButton,
              opacity:
                loading || !idea.trim()
                  ? 0.55
                  : 1,
            }}
          >
            {loading
              ? "Generating Your App..."
              : "Generate with AI →"}
          </button>
        </div>

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        {plan?.specification && (
          <section style={generatedPlan}>
            <div style={planHeader}>
              <div>
                <div style={smallLabel}>
                  AI GENERATED PLAN
                </div>

                <h2>
                  {plan.specification.name ||
                    "Your App"}
                </h2>

                <p style={paragraphText}>
                  {plan.specification.description ||
                    "Your application has been generated from your requirements."}
                </p>
              </div>

              <span style={previewBadge}>
                {getPages().length} Pages
              </span>
            </div>

            <h3>
              App Pages
            </h3>

            <div style={generatedPages}>
              {getPages().map(
                (page, index) => (
                  <div
                    key={`${page.name}-${index}`}
                    style={generatedPageCard}
                  >
                    <div
                      style={
                        generatedPageNumber
                      }
                    >
                      {index + 1}
                    </div>

                    <div>
                      <strong>
                        {page.name}
                      </strong>

                      <div
                        style={
                          mutedText
                        }
                      >
                        {page.purpose ||
                          "AI generated page"}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              onClick={
                continueToPreview
              }
              style={{
                ...buttonStyle,
                marginTop: 24,
              }}
            >
              Review Your App →
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function FeatureModal({
  feature,
  onClose,
}) {
  const name =
    feature?.name || "Feature";

  const description =
    feature?.description ||
    "This feature was generated from your application requirements.";

  return (
    <div
      onClick={onClose}
      style={modalOverlay}
    >
      <div
        onClick={(e) =>
          e.stopPropagation()
        }
        style={modalCard}
      >
        <div style={featureIconLarge}>
          ✦
        </div>

        <h2 style={{ marginTop: 12 }}>
          {name}
        </h2>

        <p style={paragraphText}>
          {description}
        </p>

        <div style={readyBox}>
          <strong>
            Feature Ready
          </strong>

          <p style={mutedText}>
            This feature belongs to your
            generated application and can
            be further customized with AI.
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            ...buttonStyle,
            marginTop: 18,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
}) {
  return (
    <div style={pageHeader}>
      <div style={smallLabel}>
        APP PAGE
      </div>

      <h2 style={pageHeaderTitle}>
        {title}
      </h2>

      <p style={headerSubtitle}>
        {description}
      </p>
    </div>
  );
}

/* =========================
   MAIN STYLES
========================= */

const green = "#166534";
const teal = "#0f766e";
const dark = "#17352a";

const buttonStyle = {
  padding: "11px 16px",
  borderRadius: 9,
  border: "none",
  background:
    "linear-gradient(135deg,#166534,#0f766e)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow:
    "0 5px 15px rgba(22,101,52,0.18)",
};

const secondaryButtonStyle = {
  padding: "11px 16px",
  borderRadius: 9,
  border: "1px solid #cfe2d8",
  background: "#ffffff",
  color: dark,
  cursor: "pointer",
  fontWeight: 600,
};

const appShell = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg,#eef8f1,#edf8f7)",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  padding: 16,
  boxSizing: "border-box",
};

const appContainer = {
  maxWidth: 1400,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 18,
  minHeight:
    "calc(100vh - 32px)",
  overflow: "hidden",
  boxShadow:
    "0 10px 40px rgba(22,101,52,0.08)",
};

const topHeader = {
  padding: "22px 26px",
  borderBottom:
    "1px solid #e2eee7",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const appTitle = {
  margin: "4px 0 0",
  fontSize: 26,
  color: dark,
};

const headerSubtitle = {
  margin: "5px 0 0",
  color: "#6b7f76",
  lineHeight: 1.5,
};

const appLayout = {
  display: "grid",
  gridTemplateColumns:
    "250px minmax(0,1fr)",
  minHeight:
    "calc(100vh - 125px)",
};

const sidebar = {
  borderRight:
    "1px solid #e2eee7",
  padding: 18,
  background:
    "linear-gradient(180deg,#f7fcf8,#f1f9f7)",
  display: "flex",
  flexDirection: "column",
};

const sidebarHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const sidebarTitle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#789187",
  letterSpacing: 1.2,
};

const pageCount = {
  minWidth: 24,
  height: 24,
  borderRadius: 20,
  background: "#dff1e5",
  color: green,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
};

const sidebarButton = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  textAlign: "left",
  padding: "11px 12px",
  marginBottom: 5,
  borderRadius: 9,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  transition: "0.2s",
};

const pageNumber = {
  width: 22,
  height: 22,
  borderRadius: 6,
  background: "rgba(255,255,255,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  flexShrink: 0,
};

const sidebarBottom = {
  marginTop: "auto",
  paddingTop: 20,
};

const contentArea = {
  padding: 30,
  overflowX: "auto",
};

const smallBrand = {
  fontSize: 11,
  fontWeight: 800,
  color: green,
  letterSpacing: 1.3,
};

const pageHeader = {
  marginBottom: 25,
};

const pageHeaderTitle = {
  margin: "6px 0 0",
  fontSize: 30,
  color: dark,
};

const smallLabel = {
  fontSize: 10,
  fontWeight: 800,
  color: "#4d7b68",
  letterSpacing: 1.3,
};

const pageHero = {
  padding: 26,
  borderRadius: 16,
  background:
    "linear-gradient(135deg,#e9f7ec,#e8f7f5)",
  border:
    "1px solid #d6ecdf",
  marginBottom: 22,
};

const heroTitle = {
  margin: "8px 0",
  fontSize: 30,
  color: dark,
};

const heroDescription = {
  margin: 0,
  color: "#557168",
  lineHeight: 1.7,
  maxWidth: 800,
};

const sectionTitle = {
  marginTop: 28,
  marginBottom: 14,
};

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #deebe4",
  borderRadius: 14,
  padding: 20,
  boxSizing: "border-box",
  boxShadow:
    "0 4px 18px rgba(30,80,55,0.035)",
};

const cardStyleLarge = {
  ...cardStyle,
  marginTop: 22,
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: 16,
};

const featureGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 15,
};

const featureIcon = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: "#e8f5eb",
  color: green,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  marginBottom: 12,
};

const featureIconLarge = {
  width: 52,
  height: 52,
  borderRadius: 14,
  background:
    "linear-gradient(135deg,#e2f4e6,#dff4f1)",
  color: green,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 800,
};

const paragraphText = {
  color: "#62766d",
  lineHeight: 1.7,
};

const mutedText = {
  color: "#6b7f76",
  fontSize: 14,
  marginTop: 6,
  lineHeight: 1.6,
};

const generatedInfo = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
};

const readyBox = {
  marginTop: 20,
  padding: 16,
  borderRadius: 10,
  background: "#f0f9f2",
  border:
    "1px solid #d9eddd",
};

const modifyPanel = {
  marginTop: 28,
  padding: 22,
  borderRadius: 15,
  background:
    "linear-gradient(135deg,#f0f9f3,#edf9f7)",
  border:
    "1px solid #d8ebe0",
};

const modifyTextarea = {
  width: "100%",
  minHeight: 110,
  padding: 13,
  borderRadius: 10,
  border:
    "1px solid #cfe1d7",
  boxSizing: "border-box",
  fontSize: 14,
  fontFamily:
    "Arial, Helvetica, sans-serif",
  resize: "vertical",
  marginTop: 10,
};

const modifyMessageStyle = {
  marginTop: 12,
  padding: 10,
  borderRadius: 8,
  background: "#eaf7ed",
  color: green,
  fontSize: 14,
};

const buttonRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const successBadgeStyle = {
  padding: "7px 11px",
  borderRadius: 20,
  background: "#e7f7eb",
  color: green,
  fontSize: 12,
  fontWeight: 700,
};

const previewShell = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg,#eef8f1,#edf8f7)",
  fontFamily:
    "Arial, Helvetica, sans-serif",
};

const previewLayout = {
  display: "flex",
  minHeight: "100vh",
};

const previewSidebar = {
  width: 250,
  background: "#ffffff",
  borderRight:
    "1px solid #deebe4",
  padding: 22,
  boxSizing: "border-box",
  flexShrink: 0,
};

const previewAppName = {
  margin: "8px 0 0",
  color: dark,
};

const previewSectionLabel = {
  marginTop: 28,
  marginBottom: 8,
  fontSize: 10,
  fontWeight: 800,
  color: "#789187",
  letterSpacing: 1.2,
};

const previewContent = {
  flex: 1,
  padding: 30,
  overflowX: "auto",
};

const previewTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 25,
  flexWrap: "wrap",
};

const previewBadge = {
  padding: "8px 12px",
  borderRadius: 20,
  background: "#e7f6eb",
  color: green,
  fontSize: 12,
  fontWeight: 700,
};

const previewHero = {
  padding: 30,
  borderRadius: 18,
  background:
    "linear-gradient(135deg,#dff2e4,#dff4f2)",
  border:
    "1px solid #cee6d7",
  marginBottom: 25,
};

const homeShell = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right,#dff3e6 0,#eef8f1 35%,#f8fbfa 75%)",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  padding: 24,
  boxSizing: "border-box",
};

const homeContainer = {
  maxWidth: 960,
  margin: "0 auto",
  paddingTop: 35,
};

const homeTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
};

const brandLabel = {
  display: "inline-block",
  padding: "8px 13px",
  borderRadius: 20,
  background: "#e5f5e9",
  color: green,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.2,
};

const languageBadge = {
  padding: "7px 11px",
  borderRadius: 20,
  background: "#e6f5f3",
  color: teal,
  fontSize: 11,
  fontWeight: 700,
};

const homeTitle = {
  fontSize: "clamp(36px,6vw,58px)",
  lineHeight: 1.05,
  margin: "24px 0 15px",
  color: dark,
  letterSpacing: -1.5,
};

const homeDescription = {
  color: "#60766c",
  fontSize: 17,
  lineHeight: 1.7,
  maxWidth: 720,
};

const ideaCard = {
  marginTop: 28,
  padding: 22,
  borderRadius: 18,
  background: "#ffffff",
  border:
    "1px solid #dcebe2",
  boxShadow:
    "0 12px 40px rgba(22,101,52,0.07)",
};

const homeTextarea = {
  width: "100%",
  minHeight: 180,
  marginTop: 12,
  padding: 16,
  borderRadius: 12,
  border:
    "1px solid #ccdfd4",
  fontSize: 16,
  lineHeight: 1.6,
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  outline: "none",
};

const primaryLargeButton = {
  marginTop: 15,
  padding: "15px 22px",
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(135deg,#166534,#0f766e)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 15,
  boxShadow:
    "0 8px 20px rgba(22,101,52,0.2)",
};

const errorBox = {
  marginTop: 20,
  padding: 15,
  background: "#fff1f1",
  color: "#b42318",
  border:
    "1px solid #ffd5d5",
  borderRadius: 10,
};

const generatedPlan = {
  marginTop: 28,
  padding: 22,
  background: "#ffffff",
  border:
    "1px solid #dcebe2",
  borderRadius: 16,
  boxShadow:
    "0 8px 30px rgba(22,101,52,0.05)",
};

const planHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 15,
  flexWrap: "wrap",
};

const generatedPages = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(230px,1fr))",
  gap: 10,
};

const generatedPageCard = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 11,
  background: "#f7fbf8",
  border:
    "1px solid #dfebe4",
};

const generatedPageNumber = {
  width: 34,
  height: 34,
  borderRadius: 9,
  background:
    "linear-gradient(135deg,#166534,#0f766e)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  flexShrink: 0,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(14,35,27,0.48)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 100,
};

const modalCard = {
  width: "100%",
  maxWidth: 540,
  background: "#ffffff",
  borderRadius: 18,
  padding: 28,
  boxSizing: "border-box",
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.18)",
};
