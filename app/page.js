"use client";

import { useState } from "react";

const COLORS = {
  forest: "#12372A",
  forestDark: "#0B241B",
  emerald: "#1F7A5A",
  emeraldLight: "#E8F5EF",
  gold: "#C9A227",
  goldLight: "#F8F1D7",
  cream: "#F8F5EC",
  white: "#FFFFFF",
  text: "#18352A",
  muted: "#718078",
  border: "#DDE5DF",
  danger: "#B42318",
};

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
        throw new Error(data?.error || "Modification failed");
      }

      if (!data?.specification) {
        throw new Error("AI did not return a valid app specification.");
      }

      setPlan((currentPlan) => ({
        ...currentPlan,
        specification: data.specification,
      }));

      const updatedPages = data.specification.pages || [];

      setActivePage(updatedPages[0]?.name || "Dashboard");

      setModifyInstruction("");
      setModifyMessage("✓ Changes applied successfully.");
    } catch (err) {
      setModifyMessage(err?.message || "Something went wrong.");
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
        phone: newClientPhone.trim() || "Not provided",
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
        location: newPropertyLocation.trim() || "Location not set",
        price: newPropertyPrice.trim() || "Price not set",
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
    padding: "11px 16px",
    borderRadius: 9,
    border: "none",
    background: `linear-gradient(135deg, ${COLORS.forest}, ${COLORS.emerald})`,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(18,55,42,0.16)",
  };

  const secondaryButtonStyle = {
    padding: "11px 16px",
    borderRadius: 9,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.white,
    color: COLORS.text,
    cursor: "pointer",
    fontWeight: 600,
  };

  const inputStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 9,
    border: `1px solid ${COLORS.border}`,
    boxSizing: "border-box",
    fontSize: 14,
    background: "#fff",
    color: COLORS.text,
    outline: "none",
  };

  function renderCreatedPage() {
    if (activePage === "Client Directory") {
      return (
        <>
          <PageHeader
            title="Client Directory"
            description="Manage buyers, sellers and leads."
          />

          <div style={statsGridStyle}>
            <StatCard title="Total Clients" value={clients.length} />
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

            <div style={responsiveGridStyle}>
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name"
                style={inputStyle}
              />

              <input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Phone number"
                style={inputStyle}
              />

              <button onClick={addClient} style={buttonStyle}>
                + Add Client
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {clients.map((client) => (
              <div key={client.id} style={listItemStyle}>
                <div>
                  <strong>{client.name}</strong>

                  <div style={mutedText}>{client.phone}</div>

                  <div style={mutedText}>
                    Budget: {client.budget}
                  </div>
                </div>

                <span style={badgeStyle}>{client.status}</span>
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

            <div style={responsiveGridStyle}>
              <input
                value={newPropertyTitle}
                onChange={(e) =>
                  setNewPropertyTitle(e.target.value)
                }
                placeholder="Property title"
                style={inputStyle}
              />

              <input
                value={newPropertyLocation}
                onChange={(e) =>
                  setNewPropertyLocation(e.target.value)
                }
                placeholder="Location"
                style={inputStyle}
              />

              <input
                value={newPropertyPrice}
                onChange={(e) =>
                  setNewPropertyPrice(e.target.value)
                }
                placeholder="Price"
                style={inputStyle}
              />

              <button onClick={addProperty} style={buttonStyle}>
                + Add Property
              </button>
            </div>
          </div>

          <div style={propertyGridStyle}>
            {properties.map((property) => (
              <div
                key={property.id}
                style={{
                  ...cardStyle,
                  margin: 0,
                }}
              >
                <div style={propertyImageStyle}>
                  Property Image
                </div>

                <h3>{property.title}</h3>

                <p style={mutedText}>{property.location}</p>

                <strong style={{ color: COLORS.forest }}>
                  {property.price}
                </strong>

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

    if (activePage === "Calendar & Appointments") {
      return (
        <>
          <PageHeader
            title="Calendar & Appointments"
            description="Manage viewings and appointments."
          />

          <button onClick={addAppointment} style={buttonStyle}>
            + New Appointment
          </button>

          <div style={{ marginTop: 20 }}>
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                style={listItemStyle}
              >
                <div>
                  <strong>{appointment.client}</strong>

                  <div style={mutedText}>
                    {appointment.property}
                  </div>

                  <div style={mutedText}>
                    {appointment.date} · {appointment.time}
                  </div>
                </div>

                <span style={badgeStyle}>
                  {appointment.status}
                </span>
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle, marginTop: 20 }}>
            <h3>Viewing Schedule</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(80px,1fr))",
                gap: 7,
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
                <div key={day} style={calendarDayStyle}>
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
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a follow-up task..."
                style={{
                  ...inputStyle,
                  flex: 1,
                  minWidth: 220,
                }}
              />

              <button onClick={addTask} style={buttonStyle}>
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
                      textDecoration: task.done
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
                  <span style={badgeStyle}>{task.priority}</span>

                  <button
                    onClick={() => toggleTask(task.id)}
                    style={secondaryButtonStyle}
                  >
                    {task.done ? "Undo" : "Complete"}
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

          <div style={pipelineGridStyle}>
            {stages.map((stage, index) => (
              <div key={stage} style={pipelineColumnStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <strong>{stage}</strong>

                  <span style={stageNumberStyle}>
                    {index + 1}
                  </span>
                </div>

                <div style={pipelineCardStyle}>
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

        <div style={statsGridStyle}>
          <StatCard title="Active Clients" value={clients.length} />
          <StatCard title="Properties" value={properties.length} />
          <StatCard
            title="Appointments"
            value={appointments.length}
          />
          <StatCard
            title="Open Tasks"
            value={
              tasks.filter((task) => !task.done).length
            }
          />
        </div>

        <div style={twoColumnGridStyle}>
          <div style={cardStyle}>
            <h3>Today's Priorities</h3>

            {tasks
              .filter((task) => !task.done)
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  style={smallListStyle}
                >
                  <strong>{task.title}</strong>

                  <div style={mutedText}>
                    {task.due} · {task.priority}
                  </div>
                </div>
              ))}
          </div>

          <div style={cardStyle}>
            <h3>Upcoming Appointments</h3>

            {appointments.slice(0, 3).map((appointment) => (
              <div
                key={appointment.id}
                style={smallListStyle}
              >
                <strong>{appointment.client}</strong>

                <div style={mutedText}>
                  {appointment.date} · {appointment.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: 18 }}>
          <h3>Quick Actions</h3>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActivePage("Client Directory")}
              style={buttonStyle}
            >
              Add Client
            </button>

            <button
              onClick={() => setActivePage("Property Listings")}
              style={buttonStyle}
            >
              Add Property
            </button>

            <button
              onClick={() =>
                setActivePage("Calendar & Appointments")
              }
              style={buttonStyle}
            >
              Book Viewing
            </button>

            <button
              onClick={() => setActivePage("Deal Pipeline")}
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
      <main style={appBackgroundStyle}>
        <div style={appShellStyle}>
          <header style={appHeaderStyle}>
            <div>
              <div style={brandSmall}>AI APP BUILDER</div>

              <h1
                style={{
                  margin: "4px 0 0",
                  fontSize: 25,
                  color: COLORS.forest,
                }}
              >
                {specification.name || "My App"}
              </h1>

              <p
                style={{
                  margin: "5px 0 0",
                  color: COLORS.muted,
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
                flexWrap: "wrap",
              }}
            >
              <span style={successBadgeStyle}>
                ✓ App Created
              </span>

              <button
                onClick={() => setCreated(false)}
                style={secondaryButtonStyle}
              >
                Back to Preview
              </button>
            </div>
          </header>

          <div style={createdLayoutStyle}>
            <aside style={sidebarStyle}>
              <div style={sidebarTitle}>PAGES</div>

              {allPages.map((page, index) => (
                <button
                  key={`${page.name}-${index}`}
                  onClick={() => selectPage(page)}
                  style={{
                    ...sidebarButtonStyle,
                    background:
                      activePage === page.name
                        ? COLORS.forest
                        : "transparent",
                    color:
                      activePage === page.name
                        ? "#fff"
                        : COLORS.text,
                  }}
                >
                  {page.name}
                </button>
              ))}

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

            <section style={contentStyle}>
              {renderCreatedPage()}
            </section>
          </div>
        </div>

        {activeFeature && (
          <FeatureModal
            feature={activeFeature}
            closeFeature={closeFeature}
          />
        )}
      </main>
    );
  }

  if (preview && plan?.specification) {
    const specification = plan.specification;
    const pages = specification.pages || [];
    const features = specification.features || [];

    return (
      <main style={appBackgroundStyle}>
        <div style={previewLayoutStyle}>
          <aside style={previewSidebarStyle}>
            <div style={brandSmall}>AI APP BUILDER</div>

            <h2
              style={{
                marginTop: 7,
                color: COLORS.forest,
              }}
            >
              {specification.name || "My App"}
            </h2>

            <p
              style={{
                color: COLORS.muted,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Interactive App Preview
            </p>

            <div style={sidebarTitle}>APP PAGES</div>

            {pages.map((page, index) => (
              <button
                key={`${page.name}-${index}`}
                onClick={() => selectPage(page)}
                style={{
                  ...sidebarButtonStyle,
                  marginTop: 7,
                  background:
                    activePage === page.name
                      ? COLORS.forest
                      : "transparent",
                  color:
                    activePage === page.name
                      ? "#fff"
                      : COLORS.text,
                }}
              >
                {index + 1}. {page.name}
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

          <section style={previewContentStyle}>
            <div style={previewTopBar}>
              <div>
                <div style={brandSmall}>PREVIEW MODE</div>

                <h1
                  style={{
                    margin: "5px 0",
                    color: COLORS.forest,
                  }}
                >
                  {activePage}
                </h1>

                <p style={{ color: COLORS.muted }}>
                  {pages.find(
                    (page) => page.name === activePage
                  )?.purpose ||
                    "Interactive application preview."}
                </p>
              </div>

              <div style={goldTag}>AI GENERATED</div>
            </div>

            <div style={{ ...cardStyle, marginTop: 24 }}>
              <h2>{activePage}</h2>

              <p
                style={{
                  color: COLORS.muted,
                  lineHeight: 1.6,
                }}
              >
                {pages.find(
                  (page) => page.name === activePage
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
                          page.name === activePage
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
                marginTop: 28,
                color: COLORS.forest,
              }}
            >
              Features
            </h3>

            <div style={featureGridStyle}>
              {features.map((feature, index) => (
                <div
                  key={`${feature.name}-${index}`}
                  style={cardStyle}
                >
                  <div style={featureIcon}>✦</div>

                  <h3>{feature.name}</h3>

                  <p
                    style={{
                      ...mutedText,
                      lineHeight: 1.5,
                    }}
                  >
                    {feature.description}
                  </p>

                  <button
                    onClick={() => openFeature(feature)}
                    style={secondaryButtonStyle}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>

            <div style={modifyCardStyle}>
              <div>
                <div style={brandSmall}>AI MODIFICATION</div>

                <h3
                  style={{
                    margin: "5px 0",
                    color: COLORS.forest,
                  }}
                >
                  Modify your app
                </h3>

                <p
                  style={{
                    marginTop: 5,
                    color: COLORS.muted,
                  }}
                >
                  Tell the AI what you want to change.
                </p>
              </div>

              <textarea
                value={modifyInstruction}
                onChange={(e) =>
                  setModifyInstruction(e.target.value)
                }
                placeholder="Example: Add a sales analytics page..."
                style={{
                  ...inputStyle,
                  minHeight: 100,
                  marginTop: 12,
                  resize: "vertical",
                }}
              />

              <button
                onClick={modifyApp}
                disabled={
                  modifyLoading ||
                  !modifyInstruction.trim()
                }
                style={{
                  ...buttonStyle,
                  marginTop: 10,
                  opacity:
                    modifyLoading ||
                    !modifyInstruction.trim()
                      ? 0.6
                      : 1,
                }}
              >
                {modifyLoading
                  ? "AI is modifying..."
                  : "Apply AI Changes →"}
              </button>

              {modifyMessage && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 11,
                    borderRadius: 8,
                    background: COLORS.emeraldLight,
                    color: COLORS.emerald,
                    fontSize: 14,
                  }}
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
            closeFeature={closeFeature}
          />
        )}
      </main>
    );
  }

  return (
    <main style={landingStyle}>
      <div style={landingGlowOne} />
      <div style={landingGlowTwo} />

      <div style={landingContainer}>
        <div style={heroBadge}>
          <span style={heroDot}>✦</span>
          AI-POWERED APP BUILDER
        </div>

        <h1 style={heroTitle}>
          Turn Your Idea
          <br />
          <span style={heroGoldText}>Into a Real App.</span>
        </h1>

        <p style={heroDescription}>
          Describe your application in natural language.
          <br />
          Our AI creates the structure, pages and features for you.
        </p>

        <div style={generatorCard}>
          <div style={inputLabel}>WHAT DO YOU WANT TO BUILD?</div>

          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe the app you want to build..."
            style={heroTextarea}
          />

          <button
            onClick={generateApp}
            disabled={loading || !idea.trim()}
            style={{
              ...heroButton,
              opacity:
                loading || !idea.trim()
                  ? 0.55
                  : 1,
            }}
          >
            {loading ? (
              <>
                <span style={spinner}>◌</span>
                Generating...
              </>
            ) : (
              <>
                Generate with AI
                <span style={{ fontSize: 18 }}>→</span>
              </>
            )}
          </button>

          {error && (
            <div style={errorBox}>
              {error}
            </div>
          )}
        </div>

        <div style={trustRow}>
          <span>✦ AI GENERATED</span>
          <span>•</span>
          <span>⚡ FAST</span>
          <span>•</span>
          <span>🔒 SECURE</span>
        </div>

        {plan?.specification && (
          <section style={planCard}>
            <div style={goldTag}>YOUR APP PLAN</div>

            <h2
              style={{
                color: COLORS.forest,
                marginBottom: 8,
              }}
            >
              {plan.specification.name || "Your App"}
            </h2>

            <p
              style={{
                color: COLORS.muted,
                lineHeight: 1.6,
              }}
            >
              {plan.specification.description}
            </p>

            <h3 style={{ color: COLORS.forest }}>
              App Pages
            </h3>

            {(plan.specification.pages || []).map(
              (page, index) => (
                <div
                  key={`${page.name}-${index}`}
                  style={planPageStyle}
                >
                  <div style={pageNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <strong>{page.name}</strong>

                    <div style={mutedText}>
                      {page.purpose}
                    </div>
                  </div>
                </div>
              )
            )}

            <button
              onClick={continueToPreview}
              style={{
                ...buttonStyle,
                marginTop: 20,
                width: "100%",
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

const landingStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #244D3A 0%, #12372A 35%, #0B241B 100%)",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  color: "#fff",
  padding: 24,
  boxSizing: "border-box",
  position: "relative",
  overflow: "hidden",
};

const landingGlowOne = {
  position: "absolute",
  width: 400,
  height: 400,
  borderRadius: "50%",
  background: "rgba(201,162,39,0.10)",
  top: -180,
  right: -120,
  filter: "blur(20px)",
};

const landingGlowTwo = {
  position: "absolute",
  width: 300,
  height: 300,
  borderRadius: "50%",
  background: "rgba(31,122,90,0.20)",
  bottom: -150,
  left: -100,
  filter: "blur(20px)",
};

const landingContainer = {
  maxWidth: 900,
  margin: "0 auto",
  position: "relative",
  zIndex: 2,
  textAlign: "center",
  paddingTop: 55,
};

const heroBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 13px",
  borderRadius: 30,
  border: "1px solid rgba(201,162,39,0.45)",
  background: "rgba(255,255,255,0.06)",
  color: "#E7D48A",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
};

const heroDot = {
  color: "#D9B93F",
};

const heroTitle = {
  fontSize: "clamp(42px, 8vw, 72px)",
  lineHeight: 1.04,
  margin: "28px 0 20px",
  fontWeight: 800,
  letterSpacing: -2,
};

const heroGoldText = {
  color: "#D8B83C",
};

const heroDescription = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 16,
  lineHeight: 1.7,
  marginBottom: 30,
};

const generatorCard = {
  maxWidth: 720,
  margin: "0 auto",
  padding: 20,
  borderRadius: 18,
  background: "rgba(255,255,255,0.97)",
  boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
  textAlign: "left",
};

const inputLabel = {
  color: COLORS.forest,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1,
  marginBottom: 8,
};

const heroTextarea = {
  width: "100%",
  minHeight: 130,
  padding: 15,
  boxSizing: "border-box",
  borderRadius: 12,
  border: `1px solid ${COLORS.border}`,
  resize: "vertical",
  fontSize: 16,
  color: COLORS.text,
  outline: "none",
};

const heroButton = {
  width: "100%",
  marginTop: 12,
  padding: "15px 20px",
  borderRadius: 11,
  border: "none",
  background:
    "linear-gradient(135deg,#C9A227,#E0BE4B)",
  color: "#172B20",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 15,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
  boxShadow: "0 7px 20px rgba(201,162,39,0.25)",
};

const spinner = {
  fontSize: 20,
};

const trustRow = {
  display: "flex",
  justifyContent: "center",
  gap: 12,
  marginTop: 20,
  color: "rgba(255,255,255,0.48)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  flexWrap: "wrap",
};

const planCard = {
  marginTop: 30,
  background: COLORS.white,
  color: COLORS.text,
  padding: 26,
  borderRadius: 18,
  textAlign: "left",
  boxShadow: "0 15px 45px rgba(0,0,0,0.2)",
};

const planPageStyle = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: 13,
  borderBottom: `1px solid ${COLORS.border}`,
};

const pageNumber = {
  width: 34,
  height: 34,
  borderRadius: 9,
  background: COLORS.goldLight,
  color: COLORS.gold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 800,
};

const appBackgroundStyle = {
  minHeight: "100vh",
  background: COLORS.cream,
  fontFamily: "Arial, Helvetica, sans-serif",
  color: COLORS.text,
  padding: 18,
  boxSizing: "border-box",
};

const appShellStyle = {
  maxWidth: 1250,
  margin: "0 auto",
  background: COLORS.white,
  borderRadius: 18,
  minHeight: "calc(100vh - 36px)",
  overflow: "hidden",
  boxShadow: "0 10px 35px rgba(18,55,42,0.10)",
};

const appHeaderStyle = {
  padding: "20px 24px",
  borderBottom: `1px solid ${COLORS.border}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const createdLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "230px 1fr",
  minHeight: "calc(100vh - 130px)",
};

const sidebarStyle = {
  borderRight: `1px solid ${COLORS.border}`,
  padding: 18,
  background: "#F4F7F3",
};

const previewSidebarStyle = {
  width: 240,
  background: COLORS.white,
  borderRight: `1px solid ${COLORS.border}`,
  padding: 20,
  boxSizing: "border-box",
  flexShrink: 0,
};

const sidebarTitle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#93A099",
  marginBottom: 10,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const sidebarButtonStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "11px 12px",
  marginBottom: 5,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const contentStyle = {
  padding: 28,
  overflowX: "auto",
};

const previewLayoutStyle = {
  display: "flex",
  minHeight: "calc(100vh - 36px)",
  maxWidth: 1400,
  margin: "0 auto",
  background: COLORS.white,
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 10px 35px rgba(18,55,42,0.10)",
};

const previewContentStyle = {
  flex: 1,
  padding: 30,
  overflowX: "auto",
};

const previewTopBar = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "center",
  flexWrap: "wrap",
};

const modifyCardStyle = {
  marginTop: 28,
  padding: 20,
  borderRadius: 14,
  background: "#F4F8F4",
  border: `1px solid ${COLORS.border}`,
};

const featureGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 15,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};

const responsiveGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
  gap: 10,
};

const propertyGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
  marginTop: 20,
};

const twoColumnGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: 18,
  marginTop: 22,
};

const pipelineGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
};

const pipelineColumnStyle = {
  background: "#F4F7F3",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 14,
  minHeight: 220,
};

const pipelineCardStyle = {
  padding: 14,
  borderRadius: 10,
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  marginBottom: 10,
};

const stageNumberStyle = {
  fontSize: 11,
  color: COLORS.gold,
  fontWeight: 800,
};

const propertyImageStyle = {
  height: 120,
  borderRadius: 10,
  background:
    "linear-gradient(135deg,#DCEBE2,#F8F1D7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
  color: COLORS.emerald,
  fontWeight: 700,
};

const calendarDayStyle = {
  minHeight: 80,
  padding: 8,
  borderRadius: 8,
  background: "#F7F9F6",
  border: `1px solid ${COLORS.border}`,
  fontSize: 12,
};

const cardStyle = {
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 20,
  boxSizing: "border-box",
  boxShadow: "0 3px 14px rgba(18,55,42,0.035)",
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: 16,
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  marginBottom: 10,
  flexWrap: "wrap",
};

const smallListStyle = {
  padding: 12,
  borderBottom: `1px solid ${COLORS.border}`,
};

const mutedText = {
  color: COLORS.muted,
  fontSize: 14,
  marginTop: 5,
};

const badgeStyle = {
  padding: "6px 10px",
  borderRadius: 20,
  background: COLORS.emeraldLight,
  color: COLORS.emerald,
  fontSize: 12,
  fontWeight: 700,
};

const successBadgeStyle = {
  padding: "7px 11px",
  borderRadius: 20,
  background: COLORS.emeraldLight,
  color: COLORS.emerald,
  fontSize: 12,
  fontWeight: 700,
};

const goldTag = {
  display: "inline-block",
  padding: "6px 9px",
  borderRadius: 20,
  background: COLORS.goldLight,
  color: "#8B7013",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.8,
};

const brandSmall = {
  color: COLORS.gold,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1.2,
};

const featureIcon = {
  width: 32,
  height: 32,
  borderRadius: 9,
  background: COLORS.goldLight,
  color: COLORS.gold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 8,
};

const errorBox = {
  marginTop: 14,
  padding: 12,
  background: "#FFF0EF",
  color: COLORS.danger,
  borderRadius: 9,
  fontSize: 14,
};

function FeatureModal({ feature, closeFeature }) {
  return (
    <div
      onClick={closeFeature}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,28,20,0.58)",
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
          background: COLORS.white,
          borderRadius: 16,
          padding: 28,
          boxSizing: "border-box",
          boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
        }}
      >
        <div style={goldTag}>FEATURE</div>

        <h2
          style={{
            color: COLORS.forest,
            marginTop: 12,
          }}
        >
          {feature.name}
        </h2>

        <p
          style={{
            color: COLORS.muted,
            lineHeight: 1.7,
          }}
        >
          {feature.description}
        </p>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 10,
            background: "#F4F8F4",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <strong style={{ color: COLORS.forest }}>
            Feature Ready
          </strong>

          <p
            style={{
              color: COLORS.muted,
              fontSize: 14,
              lineHeight: 1.5,
              marginBottom: 0,
            }}
          >
            This feature is connected to your generated
            application and is ready for further development.
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
  );
}

function StatCard({ title, value }) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          color: COLORS.muted,
          fontSize: 13,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          marginTop: 8,
          color: COLORS.forest,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 9,
          width: 35,
          height: 3,
          background: COLORS.gold,
          borderRadius: 5,
        }}
      />
    </div>
  );
}

function PageHeader({ title, description }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={brandSmall}>AI APP BUILDER</div>

      <h2
        style={{
          margin: "5px 0 0",
          fontSize: 28,
          color: COLORS.forest,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          color: COLORS.muted,
          lineHeight: 1.6,
          marginTop: 7,
        }}
      >
        {description}
      </p>
    </div>
  );
}
