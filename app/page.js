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

  const [clients, setClients] = useState([
    {
      id: 1,
      name: "John Tan",
      phone: "+60 12-345 6789",
      status: "Active Buyer",
      budget: "RM 800,000",
    },
    {
      id: 2,
      name: "Sarah Lim",
      phone: "+60 17-222 8899",
      status: "New Lead",
      budget: "RM 650,000",
    },
    {
      id: 3,
      name: "Michael Wong",
      phone: "+60 19-888 1234",
      status: "Viewing",
      budget: "RM 1,200,000",
    },
  ]);

  const [properties, setProperties] = useState([
    {
      id: 1,
      title: "Modern 3 Bedroom Residence",
      location: "Kuala Lumpur",
      price: "RM 780,000",
      status: "Available",
    },
    {
      id: 2,
      title: "Family Home with Garden",
      location: "Johor Bahru",
      price: "RM 920,000",
      status: "Available",
    },
    {
      id: 3,
      title: "Luxury City Apartment",
      location: "Petaling Jaya",
      price: "RM 1,350,000",
      status: "Priority",
    },
  ]);

  const [appointments, setAppointments] = useState([
    {
      id: 1,
      client: "John Tan",
      property: "Modern 3 Bedroom Residence",
      date: "2026-08-27",
      time: "10:00 AM",
      status: "Confirmed",
    },
    {
      id: 2,
      client: "Sarah Lim",
      property: "Family Home with Garden",
      date: "2026-08-28",
      time: "2:30 PM",
      status: "Pending",
    },
  ]);

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Follow up with John Tan",
      due: "Today",
      priority: "High",
      done: false,
    },
    {
      id: 2,
      title: "Send property details to Sarah Lim",
      due: "Tomorrow",
      priority: "Medium",
      done: false,
    },
    {
      id: 3,
      title: "Confirm weekend viewing",
      due: "Aug 29",
      priority: "High",
      done: false,
    },
  ]);

  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const [newPropertyTitle, setNewPropertyTitle] = useState("");
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newPropertyPrice, setNewPropertyPrice] = useState("");

  const [newTask, setNewTask] = useState("");

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
        throw new Error(
          "AI did not return a valid specification."
        );
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

      const updatedPages =
        data.specification.pages || [];

      setActivePage(
        updatedPages[0]?.name || "Dashboard"
      );

      setModifyInstruction("");
      setModifyMessage(
        "✓ Changes applied successfully."
      );
    } catch (err) {
      setModifyMessage(
        err?.message || "Something went wrong."
      );
    } finally {
      setModifyLoading(false);
    }
  }

  function addClient() {
    if (!newClientName.trim()) return;

    setClients((current) => [
      ...current,
      {
        id: Date.now(),
        name: newClientName.trim(),
        phone:
          newClientPhone.trim() || "Not provided",
        status: "New Lead",
        budget: "Not set",
      },
    ]);

    setNewClientName("");
    setNewClientPhone("");
  }

  function addProperty() {
    if (!newPropertyTitle.trim()) return;

    setProperties((current) => [
      ...current,
      {
        id: Date.now(),
        title: newPropertyTitle.trim(),
        location:
          newPropertyLocation.trim() ||
          "Location not set",
        price:
          newPropertyPrice.trim() ||
          "Price not set",
        status: "Available",
      },
    ]);

    setNewPropertyTitle("");
    setNewPropertyLocation("");
    setNewPropertyPrice("");
  }

  function addTask() {
    if (!newTask.trim()) return;

    setTasks((current) => [
      ...current,
      {
        id: Date.now(),
        title: newTask.trim(),
        due: "Today",
        priority: "Medium",
        done: false,
      },
    ]);

    setNewTask("");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              done: !task.done,
            }
          : task
      )
    );
  }

  function addAppointment() {
    setAppointments((current) => [
      ...current,
      {
        id: Date.now(),
        client: "New Client",
        property: "New Property",
        date: "2026-08-30",
        time: "11:00 AM",
        status: "Pending",
      },
    ]);
  }

  const buttonStyle = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };

  const secondaryButtonStyle = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
  };

  const inputStyle = {
    width: "100%",
    padding: 11,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    fontSize: 14,
  };

  function renderCreatedPage() {
    if (activePage === "Client Directory") {
      return (
        <>
          <PageHeader
            title="Client Directory"
            description="Manage buyers, sellers and leads."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard
              title="Total Clients"
              value={clients.length}
            />
            <StatCard
              title="Active Buyers"
              value={
                clients.filter(
                  (c) => c.status === "Active Buyer"
                ).length
              }
            />
            <StatCard
              title="New Leads"
              value={
                clients.filter(
                  (c) => c.status === "New Lead"
                ).length
              }
            />
          </div>

          <div style={cardStyle}>
            <h3>Add Client</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              <input
                value={newClientName}
                onChange={(e) =>
                  setNewClientName(e.target.value)
                }
                placeholder="Client name"
                style={inputStyle}
              />

              <input
                value={newClientPhone}
                onChange={(e) =>
                  setNewClientPhone(e.target.value)
                }
                placeholder="Phone number"
                style={inputStyle}
              />

              <button
                onClick={addClient}
                style={buttonStyle}
              >
                + Add Client
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {clients.map((client) => (
              <div
                key={client.id}
                style={listItemStyle}
              >
                <div>
                  <strong>{client.name}</strong>

                  <div style={mutedText}>
                    {client.phone}
                  </div>

                  <div style={mutedText}>
                    Budget: {client.budget}
                  </div>
                </div>

                <span style={badgeStyle}>
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (activePage === "Property Listings") {
      return (
        <>
          <PageHeader
            title="Property Listings"
            description="Manage your property inventory."
          />

          <div style={cardStyle}>
            <h3>Add Property</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <input
                value={newPropertyTitle}
                onChange={(e) =>
                  setNewPropertyTitle(
                    e.target.value
                  )
                }
                placeholder="Property title"
                style={inputStyle}
              />

              <input
                value={newPropertyLocation}
                onChange={(e) =>
                  setNewPropertyLocation(
                    e.target.value
                  )
                }
                placeholder="Location"
                style={inputStyle}
              />

              <input
                value={newPropertyPrice}
                onChange={(e) =>
                  setNewPropertyPrice(
                    e.target.value
                  )
                }
                placeholder="Price"
                style={inputStyle}
              />

              <button
                onClick={addProperty}
                style={buttonStyle}
              >
                + Add Property
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            {properties.map((property) => (
              <div
                key={property.id}
                style={{
                  ...cardStyle,
                  margin: 0,
                }}
              >
                <div
                  style={{
                    height: 120,
                    borderRadius: 10,
                    background:
                      "linear-gradient(135deg,#dbeafe,#f3f4f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    color: "#6b7280",
                  }}
                >
                  Property Image
                </div>

                <h3>{property.title}</h3>

                <p style={mutedText}>
                  {property.location}
                </p>

                <strong>{property.price}</strong>

                <div style={{ marginTop: 12 }}>
                  <span style={badgeStyle}>
                    {property.status}
                  </span>
                </div>

                <button
                  onClick={() =>
                    openFeature({
                      name: property.title,
                      description:
                        `${property.location} · ${property.price}`,
                    })
                  }
                  style={{
                    ...secondaryButtonStyle,
                    marginTop: 14,
                  }}
                >
                  View Property →
                </button>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (
      activePage === "Calendar & Appointments"
    ) {
      return (
        <>
          <PageHeader
            title="Calendar & Appointments"
            description="Manage viewings and appointments."
          />

          <button
            onClick={addAppointment}
            style={buttonStyle}
          >
            + New Appointment
          </button>

          <div style={{ marginTop: 20 }}>
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                style={listItemStyle}
              >
                <div>
                  <strong>
                    {appointment.client}
                  </strong>

                  <div style={mutedText}>
                    {appointment.property}
                  </div>

                  <div style={mutedText}>
                    {appointment.date} ·{" "}
                    {appointment.time}
                  </div>
                </div>

                <span style={badgeStyle}>
                  {appointment.status}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              ...cardStyle,
              marginTop: 20,
            }}
          >
            <h3>Viewing Schedule</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(7, 1fr)",
                gap: 6,
              }}
            >
              {[
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun",
              ].map((day) => (
                <div
                  key={day}
                  style={{
                    minHeight: 80,
                    padding: 8,
                    borderRadius: 8,
                    background: "#f9fafb",
                    border:
                      "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                >
                  <strong>{day}</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (activePage === "Follow-ups & Tasks") {
      return (
        <>
          <PageHeader
            title="Follow-ups & Tasks"
            description="Never miss an important follow-up."
          />

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                value={newTask}
                onChange={(e) =>
                  setNewTask(e.target.value)
                }
                placeholder="Add a follow-up task..."
                style={{
                  ...inputStyle,
                  flex: 1,
                  minWidth: 220,
                }}
              />

              <button
                onClick={addTask}
                style={buttonStyle}
              >
                + Add Task
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  ...listItemStyle,
                  opacity: task.done ? 0.55 : 1,
                }}
              >
                <div>
                  <strong
                    style={{
                      textDecoration:
                        task.done
                          ? "line-through"
                          : "none",
                    }}
                  >
                    {task.title}
                  </strong>

                  <div style={mutedText}>
                    Due: {task.due}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <span style={badgeStyle}>
                    {task.priority}
                  </span>

                  <button
                    onClick={() =>
                      toggleTask(task.id)
                    }
                    style={secondaryButtonStyle}
                  >
                    {task.done
                      ? "Undo"
                      : "Complete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (activePage === "Deal Pipeline") {
      const stages = [
        "New Lead",
        "Qualified",
        "Viewing",
        "Negotiation",
        "Closed",
      ];

      return (
        <>
          <PageHeader
            title="Deal Pipeline"
            description="Track every opportunity from lead to closing."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              overflowX: "auto",
            }}
          >
            {stages.map((stage, index) => (
              <div
                key={stage}
                style={{
                  background: "#f9fafb",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  minHeight: 220,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: 12,
                  }}
                >
                  <strong>{stage}</strong>

                  <span
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    {index + 1}
                  </span>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#fff",
                    border:
                      "1px solid #e5e7eb",
                    marginBottom: 10,
                  }}
                >
                  <strong>
                    {index === 0
                      ? "New Buyer Lead"
                      : index === 1
                      ? "Property Match"
                      : index === 2
                      ? "Viewing Scheduled"
                      : index === 3
                      ? "Offer Submitted"
                      : "Completed Deal"}
                  </strong>

                  <p
                    style={{
                      ...mutedText,
                      marginBottom: 0,
                    }}
                  >
                    Real estate opportunity
                  </p>
                </div>

                <button
                  onClick={() =>
                    openFeature({
                      name: stage,
                      description:
                        `Manage deals currently in the ${stage} stage.`,
                    })
                  }
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                  }}
                >
                  Open Stage
                </button>
              </div>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        <PageHeader
          title="Dashboard"
          description="High-level overview of your real estate business."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <StatCard
            title="Active Clients"
            value={clients.length}
          />

          <StatCard
            title="Properties"
            value={properties.length}
          />

          <StatCard
            title="Appointments"
            value={appointments.length}
          />

          <StatCard
            title="Open Tasks"
            value={
              tasks.filter((task) => !task.done)
                .length
            }
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
            marginTop: 22,
          }}
        >
          <div style={cardStyle}>
            <h3>Today's Priorities</h3>

            {tasks
              .filter((task) => !task.done)
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: 12,
                    borderBottom:
                      "1px solid #eee",
                  }}
                >
                  <strong>{task.title}</strong>

                  <div style={mutedText}>
                    {task.due} ·{" "}
                    {task.priority}
                  </div>
                </div>
              ))}
          </div>

          <div style={cardStyle}>
            <h3>Upcoming Appointments</h3>

            {appointments
              .slice(0, 3)
              .map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    padding: 12,
                    borderBottom:
                      "1px solid #eee",
                  }}
                >
                  <strong>
                    {appointment.client}
                  </strong>

                  <div style={mutedText}>
                    {appointment.date} ·{" "}
                    {appointment.time}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div
          style={{
            ...cardStyle,
            marginTop: 18,
          }}
        >
          <h3>Quick Actions</h3>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                setActivePage("Client Directory")
              }
              style={buttonStyle}
            >
              Add Client
            </button>

            <button
              onClick={() =>
                setActivePage("Property Listings")
              }
              style={buttonStyle}
            >
              Add Property
            </button>

            <button
              onClick={() =>
                setActivePage(
                  "Calendar & Appointments"
                )
              }
              style={buttonStyle}
            >
              Book Viewing
            </button>

            <button
              onClick={() =>
                setActivePage("Deal Pipeline")
              }
              style={buttonStyle}
            >
              View Pipeline
            </button>
          </div>
        </div>
      </>
    );
  }

  if (preview && plan?.specification && created) {
    const specification = plan.specification;
    const pages = specification.pages || [];

    const defaultPageNames = [
      "Dashboard",
      "Client Directory",
      "Property Listings",
      "Calendar & Appointments",
      "Follow-ups & Tasks",
      "Deal Pipeline",
    ];

    const allPages =
      pages.length > 0
        ? pages
        : defaultPageNames.map((name) => ({
            name,
            purpose: "Application page",
          }));

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f7f9",
          fontFamily:
            "Arial, sans-serif",
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 1250,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 18,
            minHeight:
              "calc(100vh - 36px)",
            overflow: "hidden",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <header
            style={{
              padding: "20px 24px",
              borderBottom:
                "1px solid #e5e7eb",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 15,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 25,
                }}
              >
                {specification.name ||
                  "My App"}
              </h1>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color: "#6b7280",
                }}
              >
                App Dashboard
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span
                style={successBadgeStyle}
              >
                App Created
              </span>

              <button
                onClick={() =>
                  setCreated(false)
                }
                style={
                  secondaryButtonStyle
                }
              >
                Back to Preview
              </button>
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "230px 1fr",
              minHeight:
                "calc(100vh - 130px)",
            }}
          >
            <aside
              style={{
                borderRight:
                  "1px solid #e5e7eb",
                padding: 18,
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#9ca3af",
                  marginBottom: 10,
                  textTransform:
                    "uppercase",
                }}
              >
                Pages
              </div>

              {allPages.map(
                (page, index) => (
                  <button
                    key={`${page.name}-${index}`}
                    onClick={() =>
                      selectPage(page)
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding:
                        "11px 12px",
                      marginBottom: 5,
                      borderRadius: 8,
                      border: "none",
                      cursor:
                        "pointer",
                      background:
                        activePage ===
                        page.name
                          ? "#111827"
                          : "transparent",
                      color:
                        activePage ===
                        page.name
                          ? "#fff"
                          : "#374151",
                    }}
                  >
                    {page.name}
                  </button>
                )
              )}

              <button
                onClick={goBackToPlan}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  marginTop: 20,
                }}
              >
                ← Back to Plan
              </button>
            </aside>

            <section
              style={{
                padding: 28,
                overflowX: "auto",
              }}
            >
              {renderCreatedPage()}
            </section>
          </div>
        </div>

        {activeFeature && (
          <div
            onClick={closeFeature}
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
                padding: 26,
                boxSizing: "border-box",
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
                    color: "#6b7280",
                    fontSize: 14,
                    lineHeight: 1.5,
                    marginBottom: 0,
                  }}
                >
                  This page is connected to
                  your generated application
                  and is ready for further
                  development.
                </p>
              </div>

              <button
                onClick={closeFeature}
                style={{
                  ...buttonStyle,
                  marginTop: 18,
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
    const features =
      specification.features || [];

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f7f9",
          fontFamily:
            "Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: "100vh",
          }}
        >
          <aside
            style={{
              width: 230,
              background: "#fff",
              borderRight:
                "1px solid #e5e7eb",
              padding: 20,
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              {specification.name ||
                "My App"}
            </h2>

            <p
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              Interactive App Preview
            </p>

            <div
              style={{
                marginTop: 25,
                fontSize: 12,
                fontWeight: 700,
                color: "#9ca3af",
              }}
            >
              APP PAGES
            </div>

            {pages.map(
              (page, index) => (
                <button
                  key={`${page.name}-${index}`}
                  onClick={() =>
                    selectPage(page)
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding:
                      "11px 12px",
                    marginTop: 7,
                    borderRadius: 8,
                    border: "none",
                    background:
                      activePage ===
                      page.name
                        ? "#111827"
                        : "transparent",
                    color:
                      activePage ===
                      page.name
                        ? "#fff"
                        : "#374151",
                    cursor:
                      "pointer",
                  }}
                >
                  {index + 1}.{" "}
                  {page.name}
                </button>
              )
            )}

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

          <section
            style={{
              flex: 1,
              padding: 30,
              overflowX: "auto",
            }}
          >
            <h1>
              {activePage}
            </h1>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              {pages.find(
                (page) =>
                  page.name ===
                  activePage
              )?.purpose ||
                "Interactive application preview."}
            </p>

            <div
              style={{
                ...cardStyle,
                marginTop: 24,
              }}
            >
              <h2>
                {activePage}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                {pages.find(
                  (page) =>
                    page.name ===
                    activePage
                )?.purpose ||
                  "Application page preview."}
              </p>

              <button
                onClick={() =>
                  openFeature({
                    name: activePage,
                    description:
                      pages.find(
                        (page) =>
                          page.name ===
                          activePage
                      )?.purpose ||
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

            <h3
              style={{
                marginTop: 25,
              }}
            >
              Features
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 15,
              }}
            >
              {features.map(
                (feature, index) => (
                  <div
                    key={`${feature.name}-${index}`}
                    style={cardStyle}
                  >
                    <h3>
                      {feature.name}
                    </h3>

                    <p
                      style={{
                        ...mutedText,
                        lineHeight: 1.5,
                      }}
                    >
                      {
                        feature.description
                      }
                    </p>

                    <button
                      onClick={() =>
                        openFeature(
                          feature
                        )
                      }
                      style={
                        secondaryButtonStyle
                      }
                    >
                      Open
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        {activeFeature && (
          <div
            onClick={closeFeature}
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
              <h2>
                {activeFeature.name}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                {
                  activeFeature.description
                }
              </p>

              <button
                onClick={closeFeature}
                style={{
                  ...buttonStyle,
                  marginTop: 15,
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
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1>
          AI App Builder
        </h1>

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
            resize: "vertical",
          }}
        />

        <button
          onClick={generateApp}
          disabled={
            loading || !idea.trim()
          }
          style={{
            marginTop: 16,
            padding:
              "14px 22px",
            borderRadius: 9,
            border: "none",
            background:
              loading ||
              !idea.trim()
                ? "#9ca3af"
                : "#111827",
            color: "#fff",
            cursor:
              loading ||
              !idea.trim()
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
              background:
                "#fef2f2",
              color:
                "#b91c1c",
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
              background: "#fff",
              padding: 26,
              borderRadius: 14,
              border:
                "1px solid #e5e7eb",
            }}
          >
            <h2>
              {plan.specification
                .name ||
                "Your App"}
            </h2>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              {
                plan.specification
                  .description
              }
            </p>

            <h3>
              App Pages
            </h3>

            {(
              plan.specification
                .pages || []
            ).map(
              (page, index) => (
                <div
                  key={`${page.name}-${index}`}
                  style={{
                    padding: 14,
                    borderBottom:
                      "1px solid #eee",
                  }}
                >
                  <strong>
                    {index + 1}.{" "}
                    {page.name}
                  </strong>

                  <div
                    style={{
                      color:
                        "#6b7280",
                      marginTop: 5,
                    }}
                  >
                    {
                      page.purpose
                    }
                  </div>
                </div>
              )
            )}

            <button
              onClick={
                continueToPreview
              }
              style={{
                ...buttonStyle,
                marginTop: 24,
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

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  boxSizing: "border-box",
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  marginBottom: 10,
  flexWrap: "wrap",
};

const mutedText = {
  color: "#6b7280",
  fontSize: 14,
  marginTop: 5,
};

const badgeStyle = {
  padding: "6px 10px",
  borderRadius: 20,
  background: "#f3f4f6",
  color: "#374151",
  fontSize: 12,
  fontWeight: 600,
};

const successBadgeStyle = {
  padding: "7px 11px",
  borderRadius: 20,
  background: "#ecfdf5",
  color: "#047857",
  fontSize: 12,
  fontWeight: 600,
};

function StatCard({ title, value }) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          color: "#6b7280",
          fontSize: 13,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
}) {
  return (
    <div
      style={{
        marginBottom: 24,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 28,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          color: "#6b7280",
          lineHeight: 1.6,
          marginTop: 7,
        }}
      >
        {description}
      </p>
    </div>
  );
}
