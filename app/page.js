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

      setPlan(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
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
  }

  function createApp() {
    setCreated(true);
    setActiveFeature(null);
    setActivePage("Dashboard");
    setModifyMessage("");
  }

  function openFeature(feature) {
    setActiveFeature(feature);
  }

  function closeFeature() {
    setActiveFeature(null);
  }

  function goBackToPlan() {
    setPreview(false);
    setCreated(false);
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
        err.message || "Something went wrong."
      );
    } finally {
      setModifyLoading(false);
    }
  }

  if (preview && plan?.specification) {
    const specification = plan.specification;
    const pages = specification.pages || [];
    const features = specification.features || [];

    if (created) {
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
              maxWidth: 1100,
              margin: "0 auto",
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              minHeight: "calc(100vh - 48px)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 30,
              }}
            >
              <div>
                <h1 style={{ margin: 0 }}>
                  {specification.name || "My App"}
                </h1>

                <p
                  style={{
                    color: "#6b7280",
                    marginTop: 8,
                  }}
                >
                  App Dashboard
                </p>
              </div>

              <span
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  padding: "8px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                App Created
              </span>
            </div>

            {/* MODIFY WITH AI */}

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 22,
                marginBottom: 28,
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                Modify with AI
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                Tell AI what you want to change in your app.
              </p>

              <textarea
                value={modifyInstruction}
                onChange={(e) =>
                  setModifyInstruction(e.target.value)
                }
                placeholder="Example: Add a membership page and a loyalty points feature."
                style={{
                  width: "100%",
                  minHeight: 110,
                  padding: 14,
                  borderRadius: 9,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={modifyApp}
                disabled={
                  modifyLoading ||
                  !modifyInstruction.trim()
                }
                style={{
                  marginTop: 12,
                  padding: "12px 18px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    modifyLoading ||
                    !modifyInstruction.trim()
                      ? "#9ca3af"
                      : "#111827",
                  color: "#fff",
                  cursor:
                    modifyLoading ||
                    !modifyInstruction.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 600,
                }}
              >
                {modifyLoading
                  ? "AI is modifying..."
                  : "Apply Changes"}
              </button>

              {modifyMessage && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 8,
                    background:
                      modifyMessage.startsWith("✓")
                        ? "#ecfdf5"
                        : "#fef2f2",
                    color:
                      modifyMessage.startsWith("✓")
                        ? "#047857"
                        : "#b91c1c",
                    fontSize: 14,
                  }}
                >
                  {modifyMessage}
                </div>
              )}
            </div>

            {/* APP PAGES */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {pages.map((page) => (
                <button
                  key={page.name}
                  onClick={() =>
                    setActivePage(page.name)
                  }
                  style={{
                    textAlign: "left",
                    padding: 20,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <strong>{page.name}</strong>

                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: 14,
                      lineHeight: 1.5,
                      marginBottom: 0,
                    }}
                  >
                    {page.purpose ||
                      "Open this page"}
                  </p>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 28,
                padding: 24,
                borderRadius: 12,
                background: "#f9fafb",
              }}
            >
              <h2>{activePage}</h2>

              <p style={{ color: "#6b7280" }}>
                {pages.find(
                  (p) => p.name === activePage
                )?.purpose ||
                  "Your application dashboard."}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() =>
                    setActiveFeature({
                      name: activePage,
                      description:
                        pages.find(
                          (p) =>
                            p.name === activePage
                        )?.purpose ||
                        "Application page",
                    })
                  }
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#111827",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Open Page
                </button>

                <button
                  onClick={() => setCreated(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border:
                      "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Back to Preview
                </button>
              </div>
            </div>

            {activeFeature && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background:
                    "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                  zIndex: 100,
                }}
                onClick={closeFeature}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 500,
                    background: "#fff",
                    borderRadius: 16,
                    padding: 26,
                  }}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <h2>
                    {activeFeature.name}
                  </h2>

                  <p
                    style={{
                      color: "#6b7280",
                      lineHeight: 1.6,
                    }}
                  >
                    {activeFeature.description}
                  </p>

                  <button
                    onClick={closeFeature}
                    style={{
                      marginTop: 16,
                      padding: "10px 16px",
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
          </div>
        </main>
      );
    }

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
            borderRight:
              "1px solid #e5e7eb",
            padding: 24,
          }}
        >
          <h2 style={{ marginBottom: 8 }}>
            {specification.name ||
              "My App"}
          </h2>

          <p
            style={{
              color: "#6b7280",
              fontSize: 13,
              marginBottom: 28,
            }}
          >
            App Preview
          </p>

          {pages.map((page) => (
            <button
              key={page.name}
              onClick={() => {
                setActivePage(page.name);
                setActiveFeature(null);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                marginBottom: 8,
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
              {page.name}
            </button>
          ))}

          <button
            onClick={goBackToPlan}
            style={{
              marginTop: 30,
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border:
                "1px solid #d1d5db",
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
            padding: 36,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 30,
              minHeight:
                "calc(100vh - 72px)",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 30,
              }}
            >
              <div>
                <h1 style={{ margin: 0 }}>
                  {activePage}
                </h1>

                <p
                  style={{
                    color: "#6b7280",
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
                }}
              >
                Preview
              </span>
            </div>

            <div
              style={{
                padding: 22,
                background: "#f9fafb",
                borderRadius: 12,
                marginBottom: 24,
              }}
            >
              <h3>{activePage}</h3>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                {pages.find(
                  (p) =>
                    p.name === activePage
                )?.purpose ||
                  "App page preview"}
              </p>

              <button
                onClick={() =>
                  openFeature({
                    name: activePage,
                    description:
                      pages.find(
                        (p) =>
                          p.name === activePage
                      )?.purpose ||
                      "Application page",
                  })
                }
                style={{
                  marginTop: 12,
                  padding: "9px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Open Page
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {features.map((feature) => (
                <div
                  key={feature.name}
                  style={{
                    background: "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 20,
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
                      marginTop: 10,
                      padding:
                        "8px 12px",
                      borderRadius: 7,
                      border:
                        "1px solid #d1d5db",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {activeFeature && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 100,
            }}
            onClick={closeFeature}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                background: "#fff",
                borderRadius: 16,
                padding: 28,
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <h2>
                {activeFeature.name}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.6,
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
                  Feature Preview
                </strong>

                <p
                  style={{
                    color: "#6b7280",
                    fontSize: 14,
                  }}
                >
                  This feature is connected
                  to your generated app preview
                  and is ready for the next
                  Create App stage.
                </p>
              </div>

              <button
                onClick={closeFeature}
                style={{
                  marginTop: 18,
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
        fontFamily:
          "Arial, sans-serif",
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
            border:
              "1px solid #d1d5db",
            fontSize: 16,
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={generateApp}
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "14px 22px",
            borderRadius: 9,
            border: "none",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
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
              border:
                "1px solid #e5e7eb",
            }}
          >
            <h2>
              {plan.specification.name ||
                "Your App"}
            </h2>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              {plan.specification.description}
            </p>

            <h3>App Pages</h3>

            {(plan.specification.pages ||
              []).map((page, index) => (
              <div
                key={page.name}
                style={{
                  padding: 14,
                  borderBottom:
                    "1px solid #eee",
                }}
              >
                <strong>
                  {index + 1}. {page.name}
                </strong>

                <div
                  style={{
                    color: "#6b7280",
                    marginTop: 5,
                  }}
                >
                  {page.purpose}
                </div>
              </div>
            ))}

            <button
              onClick={continueToPreview}
              style={{
                marginTop: 24,
                padding:
                  "14px 24px",
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
