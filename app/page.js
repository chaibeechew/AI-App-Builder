"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [preview, setPreview] = useState(false);
  const [created, setCreated] = useState(false);

  const [activePage, setActivePage] = useState("Dashboard");
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

  function continueToPreview() {
    const pages = plan?.specification?.pages || [];

    setPreview(true);
    setCreated(false);
    setActiveFeature(null);
    setActivePage(pages[0]?.name || "Dashboard");
    setModifyMessage("");
  }

  function createApp() {
    setCreated(true);
    setActiveFeature(null);
    setActivePage("Dashboard");
    setModifyMessage("");
  }

  function goBackToPlan() {
    setPreview(false);
    setCreated(false);
    setActiveFeature(null);
  }

  function openFeature(feature) {
    setActiveFeature(feature);
  }

  function closeFeature() {
    setActiveFeature(null);
  }

  function selectPage(page) {
    setActivePage(page.name);
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
        throw new Error(
          data?.error || "Modification failed"
        );
      }

      if (!data?.specification) {
        throw new Error(
          "AI did not return a valid app specification."
        );
      }

      setPlan((currentPlan) => ({
        ...currentPlan,
        specification: data.specification,
      }));

      const updatedPages = data.specification.pages || [];

      setActivePage(
        updatedPages[0]?.name || "Dashboard"
      );

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

  if (preview && plan?.specification && created) {
    const specification = plan.specification;
    const pages = specification.pages || [];
    const features = specification.features || [];

    const currentPage =
      pages.find((page) => page.name === activePage) ||
      pages[0];

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f7f9",
          fontFamily: "Arial, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: 18,
            minHeight: "calc(100vh - 48px)",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <header
            style={{
              padding: "24px 30px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
                }}
              >
                {specification.name || "My App"}
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                App Dashboard
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  padding: "8px 13px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                App Created
              </span>

              <button
                onClick={() => setCreated(false)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Back to Preview
              </button>
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "240px 1fr",
              minHeight: "calc(100vh - 145px)",
            }}
          >
            <aside
              style={{
                borderRight: "1px solid #e5e7eb",
                padding: 20,
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#9ca3af",
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                Pages
              </div>

              {pages.map((page, index) => (
                <button
                  key={`${page.name}-${index}`}
                  onClick={() => selectPage(page)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
                    marginBottom: 6,
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    background:
                      activePage === page.name
                        ? "#111827"
                        : "transparent",
                    color:
                      activePage === page.name
                        ? "#ffffff"
                        : "#374151",
                    fontWeight:
                      activePage === page.name
                        ? 600
                        : 400,
                  }}
                >
                  {page.name}
                </button>
              ))}

              <div
                style={{
                  marginTop: 25,
                  paddingTop: 20,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  onClick={goBackToPlan}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ← Back to Plan
                </button>
              </div>
            </aside>

            <section
              style={{
                padding: 32,
              }}
            >
              <div
                style={{
                  marginBottom: 28,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 28,
                  }}
                >
                  {currentPage?.name || activePage}
                </h2>

                <p
                  style={{
                    color: "#6b7280",
                    lineHeight: 1.6,
                    marginTop: 8,
                  }}
                >
                  {currentPage?.purpose ||
                    "Application page"}
                </p>
              </div>

              <div
                style={{
                  padding: 24,
                  borderRadius: 14,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  marginBottom: 28,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    marginBottom: 8,
                  }}
                >
                  Current Page
                </div>

                <h3
                  style={{
                    margin: "0 0 8px",
                  }}
                >
                  {currentPage?.name || activePage}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    lineHeight: 1.6,
                  }}
                >
                  {currentPage?.purpose ||
                    "This page is part of your generated application."}
                </p>

                <button
                  onClick={() =>
                    openFeature({
                      name:
                        currentPage?.name ||
                        activePage,
                      description:
                        currentPage?.purpose ||
                        "Application page",
                    })
                  }
                  style={{
                    marginTop: 16,
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#111827",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Open Page →
                </button>
              </div>

              {features.length > 0 && (
                <>
                  <h3
                    style={{
                      marginBottom: 14,
                    }}
                  >
                    Features
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {features.map(
                      (feature, index) => (
                        <div
                          key={`${feature.name}-${index}`}
                          style={{
                            background: "#fff",
                            border:
                              "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 20,
                          }}
                        >
                          <h4
                            style={{
                              marginTop: 0,
                              marginBottom: 8,
                            }}
                          >
                            {feature.name}
                          </h4>

                          <p
                            style={{
                              color: "#6b7280",
                              fontSize: 14,
                              lineHeight: 1.5,
                            }}
                          >
                            {feature.description}
                          </p>

                          <button
                            onClick={() =>
                              openFeature(feature)
                            }
                            style={{
                              marginTop: 8,
                              padding:
                                "8px 12px",
                              borderRadius: 7,
                              border:
                                "1px solid #d1d5db",
                              background: "#fff",
                              cursor:
                                "pointer",
                            }}
                          >
                            Open
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        {activeFeature && (
          <div
            onClick={closeFeature}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 100,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                background: "#fff",
                borderRadius: 16,
                padding: 28,
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                {activeFeature.name}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.7,
                }}
              >
                {activeFeature.description}
              </p>

              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 10,
                  background: "#f9fafb",
                }}
              >
                <strong>
                  Feature Ready
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                    color: "#6b7280",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  This page and feature are connected
                  to the generated application.
                </p>
              </div>

              <button
                onClick={closeFeature}
                style={{
                  marginTop: 20,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (preview && plan?.specification) {
    const specification = plan.specification;
    const pages = specification.pages || [];
    const features = specification.features || [];

    const currentPage =
      pages.find((page) => page.name === activePage) ||
      pages[0];

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f7f9",
          fontFamily: "Arial, sans-serif",
          display: "flex",
        }}
      >
        <aside
          style={{
            width: 240,
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            padding: 22,
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 6,
            }}
          >
            {specification.name || "My App"}
          </h2>

          <p
            style={{
              color: "#6b7280",
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            Interactive App Preview
          </p>

          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            APP PAGES
          </div>

          {pages.map((page, index) => (
            <button
              key={`${page.name}-${index}`}
              onClick={() => selectPage(page)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                marginBottom: 6,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background:
                  activePage === page.name
                    ? "#111827"
                    : "transparent",
                color:
                  activePage === page.name
                    ? "#ffffff"
                    : "#374151",
              }}
            >
              {index + 1}. {page.name}
            </button>
          ))}

          <button
            onClick={goBackToPlan}
            style={{
              marginTop: 28,
              width: "100%",
              padding: 11,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ← Back to Plan
          </button>

          <button
            onClick={createApp}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 13,
              borderRadius: 8,
              border: "none",
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Confirm & Create App →
          </button>
        </aside>

        <section
          style={{
            flex: 1,
            padding: 32,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 30,
              minHeight: "calc(100vh - 64px)",
              boxShadow:
                "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                  }}
                >
                  {currentPage?.name ||
                    activePage}
                </h1>

                <p
                  style={{
                    color: "#6b7280",
                    marginBottom: 0,
                  }}
                >
                  Interactive App Preview
                </p>
              </div>

              <span
                style={{
                  padding: "7px 12px",
                  borderRadius: 20,
                  background: "#ecfdf5",
                  color: "#047857",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Preview
              </span>
            </div>

            <div
              style={{
                padding: 24,
                background: "#f9fafb",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                marginBottom: 26,
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                {currentPage?.name ||
                  activePage}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                {currentPage?.purpose ||
                  "App page preview"}
              </p>

              <button
                onClick={() =>
                  openFeature({
                    name:
                      currentPage?.name ||
                      activePage,
                    description:
                      currentPage?.purpose ||
                      "Application page",
                  })
                }
                style={{
                  marginTop: 10,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Open Page →
              </button>
            </div>

            <h3>Features</h3>

            {features.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  borderRadius: 10,
                  background: "#f9fafb",
                  color: "#6b7280",
                }}
              >
                No features returned yet.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {features.map(
                  (feature, index) => (
                    <div
                      key={`${feature.name}-${index}`}
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 20,
                        background: "#fff",
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                        }}
                      >
                        {feature.name}
                      </h3>

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {feature.description}
                      </p>

                      <button
                        onClick={() =>
                          openFeature(feature)
                        }
                        style={{
                          marginTop: 8,
                          padding:
                            "8px 12px",
                          borderRadius: 7,
                          border:
                            "1px solid #d1d5db",
                          background: "#fff",
                          cursor:
                            "pointer",
                        }}
                      >
                        Open
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {activeFeature && (
          <div
            onClick={closeFeature}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 100,
            }}
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                width: "100%",
                maxWidth: 520,
                background: "#fff",
                borderRadius: 16,
                padding: 28,
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                {activeFeature.name}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.7,
                }}
              >
                {activeFeature.description}
              </p>

              <button
                onClick={closeFeature}
                style={{
                  marginTop: 16,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1>AI App Builder</h1>

        <p
          style={{
            color: "#6b7280",
          }}
        >
          Turn your idea into a working app.
        </p>

        <textarea
          value={idea}
          onChange={(e) =>
            setIdea(e.target.value)
          }
          placeholder="Describe the app you want to build..."
          style={{
            width: "100%",
            minHeight: 150,
            marginTop: 24,
            padding: 16,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 16,
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />

        <button
          onClick={generateApp}
          disabled={loading || !idea.trim()}
          style={{
            marginTop: 16,
            padding: "14px 22px",
            borderRadius: 9,
            border: "none",
            background:
              loading || !idea.trim()
                ? "#9ca3af"
                : "#111827",
            color: "#fff",
            cursor:
              loading || !idea.trim()
                ? "not-allowed"
                : "pointer",
            fontWeight: 600,
          }}
        >
          {loading
            ? "Generating..."
            : "Generate with AI"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {plan?.specification && (
          <section
            style={{
              marginTop: 30,
              background: "#ffffff",
              padding: 26,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
            }}
          >
            <h2>
              {plan.specification.name ||
                "Your App"}
            </h2>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              {plan.specification.description}
            </p>

            <h3
              style={{
                marginTop: 28,
              }}
            >
              App Pages
            </h3>

            {(plan.specification.pages || []).map(
              (page, index) => (
                <button
                  key={`${page.name}-${index}`}
                  onClick={() => {
                    setActivePage(page.name);
                    setPreview(true);
                    setCreated(false);
                    setActiveFeature(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: 16,
                    border: "none",
                    borderBottom:
                      "1px solid #eee",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <strong>
                    {index + 1}. {page.name}
                  </strong>

                  <div
                    style={{
                      color: "#6b7280",
                      marginTop: 5,
                      lineHeight: 1.5,
                    }}
                  >
                    {page.purpose}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Open →
                  </div>
                </button>
              )
            )}

            <button
              onClick={continueToPreview}
              style={{
                marginTop: 24,
                padding: "14px 24px",
                borderRadius: 9,
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Confirm & Continue →
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
