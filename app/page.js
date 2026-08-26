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

  function getPages() {
    const pages = plan?.specification?.pages || [];

    if (pages.length > 0) {
      return pages;
    }

    return [
      {
        name: "Dashboard",
        purpose: "High-level overview of your application.",
      },
      {
        name: "Clients",
        purpose: "Manage clients and leads.",
      },
      {
        name: "Properties",
        purpose: "Manage property listings.",
      },
      {
        name: "Appointments",
        purpose: "Manage appointments and schedules.",
      },
      {
        name: "Tasks",
        purpose: "Manage follow-ups and tasks.",
      },
      {
        name: "Pipeline",
        purpose: "Track deals and opportunities.",
      },
    ];
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
    setActiveFeature(null);
    setActivePage(pages[0]?.name || "Dashboard");
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
        location:
          newPropertyLocation.trim() || "Location not set",
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

  function renderDashboard() {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="High-level overview of your real estate business."
        />

        <div style={statsGrid}>
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
              tasks.filter((task) => !task.done).length
            }
          />
        </div>

        <div style={twoColumnGrid}>
          <div style={cardStyle}>
            <h3>Today's Priorities</h3>

            {tasks
              .filter((task) => !task.done)
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  style={listRowStyle}
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

            {appointments
              .slice(0, 3)
              .map((appointment) => (
                <div
                  key={appointment.id}
                  style={listRowStyle}
                >
                  <strong>{appointment.client}</strong>

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

          <div style={buttonRow}>
            <button
              onClick={() =>
                setActivePage(findPageName("client"))
              }
              style={buttonStyle}
            >
              Add Client
            </button>

            <button
              onClick={() =>
                setActivePage(findPageName("property"))
              }
              style={buttonStyle}
            >
              Add Property
            </button>

            <button
              onClick={() =>
                setActivePage(findPageName("appointment"))
              }
              style={buttonStyle}
            >
              Book Viewing
            </button>

            <button
              onClick={() =>
                setActivePage(findPageName("pipeline"))
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

  function findPageName(type) {
    const pages = getPages();

    const keywords = {
      client: [
        "client",
        "customer",
        "buyer",
        "seller",
        "lead",
      ],
      property: [
        "property",
        "listing",
        "inventory",
        "house",
        "real estate",
      ],
      appointment: [
        "appointment",
        "calendar",
        "schedule",
        "viewing",
        "meeting",
      ],
      task: [
        "task",
        "follow",
        "activity",
        "reminder",
      ],
      pipeline: [
        "pipeline",
        "deal",
        "opportunity",
        "sales",
      ],
    };

    const match = pages.find((page) => {
      const name = String(page.name || "").toLowerCase();

      return keywords[type]?.some((word) =>
        name.includes(word)
      );
    });

    return match?.name || pages[0]?.name || "Dashboard";
  }

  function renderClientPage() {
    return (
      <>
        <PageHeader
          title={activePage}
          description="Manage buyers, sellers and leads."
        />

        <div style={statsGrid}>
          <StatCard
            title="Total Clients"
            value={clients.length}
          />

          <StatCard
            title="Active Buyers"
            value={
              clients.filter(
                (client) =>
                  client.status === "Active Buyer"
              ).length
            }
          />

          <StatCard
            title="New Leads"
            value={
              clients.filter(
                (client) =>
                  client.status === "New Lead"
              ).length
            }
          />
        </div>

        <div style={cardStyle}>
          <h3>Add Client</h3>

          <div style={responsiveFormGrid}>
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

  function renderPropertyPage() {
    return (
      <>
        <PageHeader
          title={activePage}
          description="Manage your property inventory and listings."
        />

        <div style={cardStyle}>
          <h3>Add Property</h3>

          <div style={responsiveFormGrid}>
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

            <button
              onClick={addProperty}
              style={buttonStyle}
            >
              + Add Property
            </button>
          </div>
        </div>

        <div style={propertyGrid}>
          {properties.map((property) => (
            <div
              key={property.id}
              style={{
                ...cardStyle,
                margin: 0,
              }}
            >
              <div style={propertyImage}>
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

  function renderAppointmentPage() {
    return (
      <>
        <PageHeader
          title={activePage}
          description="Manage viewings, meetings and appointments."
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
          <h3>Weekly Schedule</h3>

          <div style={calendarGrid}>
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
                style={calendarDay}
              >
                <strong>{day}</strong>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function renderTaskPage() {
    return (
      <>
        <PageHeader
          title={activePage}
          description="Manage follow-ups, reminders and activities."
        />

        <div style={cardStyle}>
          <div style={buttonRow}>
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

              <div style={buttonRow}>
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

  function renderPipelinePage() {
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
          title={activePage}
          description="Track every opportunity from lead to closing."
        />

        <div style={pipelineGrid}>
          {stages.map((stage, index) => (
            <div
              key={stage}
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                minHeight: 220,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
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

                <p style={mutedText}>
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

  function renderDynamicPage(page) {
    const name = String(page.name || "").toLowerCase();
    const purpose =
      page.purpose ||
      "This page was generated by AI for your application.";

    if (
      name.includes("client") ||
      name.includes("customer") ||
      name.includes("buyer") ||
      name.includes("seller") ||
      name.includes("lead")
    ) {
      return renderClientPage();
    }

    if (
      name.includes("property") ||
      name.includes("listing") ||
      name.includes("inventory") ||
      name.includes("house")
    ) {
      return renderPropertyPage();
    }

    if (
      name.includes("appointment") ||
      name.includes("calendar") ||
      name.includes("schedule") ||
      name.includes("viewing") ||
      name.includes("meeting")
    ) {
      return renderAppointmentPage();
    }

    if (
      name.includes("task") ||
      name.includes("follow") ||
      name.includes("activity") ||
      name.includes("reminder")
    ) {
      return renderTaskPage();
    }

    if (
      name.includes("pipeline") ||
      name.includes("deal") ||
      name.includes("opportunity") ||
      name.includes("sales")
    ) {
      return renderPipelinePage();
    }

    if (
      name.includes("dashboard") ||
      name.includes("home") ||
      name.includes("overview")
    ) {
      return renderDashboard();
    }

    return (
      <>
        <PageHeader
          title={page.name || "Application Page"}
          description={purpose}
        />

        <div style={twoColumnGrid}>
          <div style={cardStyle}>
            <h3>{page.name}</h3>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.7,
              }}
            >
              {purpose}
            </p>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                background: "#f9fafb",
                borderRadius: 10,
                border:
                  "1px solid #e5e7eb",
              }}
            >
              <strong>AI Generated Page</strong>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 0,
                }}
              >
                This page was automatically created
                from your app specification.
              </p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3>Page Actions</h3>

            <div style={buttonRow}>
              <button
                onClick={() =>
                  openFeature({
                    name: page.name,
                    description: purpose,
                  })
                }
                style={buttonStyle}
              >
                Open Details
              </button>

              <button
                onClick={() =>
                  setModifyInstruction(
                    `Improve the ${page.name} page`
                  )
                }
                style={secondaryButtonStyle}
              >
                Improve with AI
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderCreatedPage() {
    const pages = getPages();

    const currentPage =
      pages.find(
        (page) => page.name === activePage
      ) || pages[0];

    return renderDynamicPage(currentPage);
  }

  if (preview && plan?.specification && created) {
    const specification = plan.specification;
    const pages = getPages();

    return (
      <main style={appShell}>
        <div style={appContainer}>
          <header style={topHeader}>
            <div>
              <h1 style={{ margin: 0 }}>
                {specification.name ||
                  "My App"}
              </h1>

              <p style={headerSubtitle}>
                App Dashboard
              </p>
            </div>

            <div style={buttonRow}>
              <span style={successBadgeStyle}>
                ✓ App Created
              </span>

              <button
                onClick={() =>
                  setCreated(false)
                }
                style={secondaryButtonStyle}
              >
                Back to Preview
              </button>
            </div>
          </header>

          <div style={appLayout}>
            <aside style={sidebar}>
              <div style={sidebarTitle}>
                PAGES
              </div>

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
                        ? "#111827"
                        : "transparent",
                    color:
                      activePage === page.name
                        ? "#fff"
                        : "#374151",
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

            <section style={contentArea}>
              {renderCreatedPage()}
            </section>
          </div>
        </div>

        {activeFeature && (
          <FeatureModal
            feature={activeFeature}
            onClose={closeFeature}
            buttonStyle={buttonStyle}
          />
        )}
      </main>
    );
  }

  if (preview && plan?.specification) {
    const specification = plan.specification;
    const pages = getPages();
    const features =
      specification.features || [];

    return (
      <main style={previewShell}>
        <div style={previewLayout}>
          <aside style={previewSidebar}>
            <h2 style={{ marginTop: 0 }}>
              {specification.name ||
                "My App"}
            </h2>

            <p style={headerSubtitle}>
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
                      ? "#111827"
                      : "transparent",
                  color:
                    activePage === page.name
                      ? "#fff"
                      : "#374151",
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

          <section style={previewContent}>
            <PageHeader
              title={activePage}
              description={
                pages.find(
                  (page) =>
                    page.name ===
                    activePage
                )?.purpose ||
                "Interactive application preview."
              }
            />

            <div style={cardStyle}>
              <h2>{activePage}</h2>

              <p
                style={{
                  color: "#6b7280",
                  lineHeight: 1.6,
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

            <h3 style={{ marginTop: 25 }}>
              Features
            </h3>

            <div style={featureGrid}>
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
                      {feature.description}
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

            <div
              style={{
                ...cardStyle,
                marginTop: 24,
              }}
            >
              <h3>Modify Your App</h3>

              <p style={mutedText}>
                Tell AI what you want to change.
              </p>

              <textarea
                value={modifyInstruction}
                onChange={(e) =>
                  setModifyInstruction(
                    e.target.value
                  )
                }
                placeholder="Example: Add a WhatsApp contact button to the client page..."
                style={{
                  width: "100%",
                  minHeight: 110,
                  padding: 12,
                  borderRadius: 8,
                  border:
                    "1px solid #d1d5db",
                  boxSizing: "border-box",
                  fontFamily:
                    "Arial, sans-serif",
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
                  : "Modify with AI"}
              </button>

              {modifyMessage && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#374151",
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
            onClose={closeFeature}
            buttonStyle={buttonStyle}
          />
        )}
      </main>
    );
  }

  return (
    <main style={homeShell}>
      <div style={homeContainer}>
        <div style={brandLabel}>
          AI APP BUILDER
        </div>

        <h1 style={homeTitle}>
          Turn your idea into a working app.
        </h1>

        <p style={homeDescription}>
          Describe the app you want to build.
          AI will generate the structure,
          pages and features automatically.
        </p>

        <textarea
          value={idea}
          onChange={(e) =>
            setIdea(e.target.value)
          }
          placeholder="Describe the app you want to build..."
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
            ? "Generating..."
            : "Generate with AI →"}
        </button>

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        {plan?.specification && (
          <section
            style={{
              ...cardStyle,
              marginTop: 30,
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
              {
                plan.specification
                  .description
              }
            </p>

            <h3>App Pages</h3>

            {(
              plan.specification
                .pages || []
            ).map(
              (page, index) => (
                <div
                  key={`${page.name}-${index}`}
                  style={listRowStyle}
                >
                  <strong>
                    {index + 1}. {page.name}
                  </strong>

                  <div style={mutedText}>
                    {page.purpose}
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

function FeatureModal({
  feature,
  onClose,
  buttonStyle,
}) {
  return (
    <div
      onClick={onClose}
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
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {feature.name}
        </h2>

        <p
          style={{
            color: "#6b7280",
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
            This feature is connected to
            your generated application and
            is ready for further development.
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

const appShell = {
  minHeight: "100vh",
  background: "#f5f7f9",
  fontFamily: "Arial, sans-serif",
  padding: 18,
  boxSizing: "border-box",
};

const appContainer = {
  maxWidth: 1250,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 18,
  minHeight: "calc(100vh - 36px)",
  overflow: "hidden",
  boxShadow:
    "0 4px 20px rgba(0,0,0,0.06)",
};

const topHeader = {
  padding: "20px 24px",
  borderBottom:
    "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const headerSubtitle = {
  margin: "5px 0 0",
  color: "#6b7280",
};

const appLayout = {
  display: "grid",
  gridTemplateColumns:
    "230px 1fr",
  minHeight:
    "calc(100vh - 130px)",
};

const sidebar = {
  borderRight:
    "1px solid #e5e7eb",
  padding: 18,
  background: "#fafafa",
};

const sidebarTitle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#9ca3af",
  marginBottom: 10,
  textTransform: "uppercase",
};

const sidebarButton = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "11px 12px",
  marginBottom: 5,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const contentArea = {
  padding: 28,
  overflowX: "auto",
};

const previewShell = {
  minHeight: "100vh",
  background: "#f5f7f9",
  fontFamily: "Arial, sans-serif",
};

const previewLayout = {
  display: "flex",
  minHeight: "100vh",
};

const previewSidebar = {
  width: 230,
  background: "#fff",
  borderRight:
    "1px solid #e5e7eb",
  padding: 20,
  boxSizing: "border-box",
  flexShrink: 0,
};

const previewContent = {
  flex: 1,
  padding: 30,
  overflowX: "auto",
};

const homeShell = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg,#f5f7f9,#eef5f1)",
  fontFamily: "Arial, sans-serif",
  padding: 24,
  boxSizing: "border-box",
};

const homeContainer = {
  maxWidth: 900,
  margin: "0 auto",
};

const brandLabel = {
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: 20,
  background: "#ecfdf5",
  color: "#047857",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
};

const homeTitle = {
  fontSize: 42,
  lineHeight: 1.1,
  margin: "22px 0 12px",
};

const homeDescription = {
  color: "#6b7280",
  fontSize: 17,
  lineHeight: 1.6,
  maxWidth: 680,
};

const homeTextarea = {
  width: "100%",
  minHeight: 160,
  marginTop: 24,
  padding: 16,
  borderRadius: 12,
  border:
    "1px solid #d1d5db",
  fontSize: 16,
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily:
    "Arial, sans-serif",
};

const primaryLargeButton = {
  marginTop: 16,
  padding: "14px 22px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
};

const errorBox = {
  marginTop: 20,
  padding: 16,
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 8,
};

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  boxSizing: "border-box",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: 18,
  marginTop: 22,
};

const responsiveFormGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
};

const propertyGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
  marginTop: 20,
};

const featureGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 15,
};

const pipelineGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
};

const buttonRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const listRowStyle = {
  padding: 12,
  borderBottom:
    "1px solid #eee",
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: 16,
  background: "#fff",
  border:
    "1px solid #e5e7eb",
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

const propertyImage = {
  height: 120,
  borderRadius: 10,
  background:
    "linear-gradient(135deg,#dbeafe,#f3f4f6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
  color: "#6b7280",
};

const calendarGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(7,1fr)",
  gap: 6,
};

const calendarDay = {
  minHeight: 80,
  padding: 8,
  borderRadius: 8,
  background: "#f9fafb",
  border:
    "1px solid #e5e7eb",
  fontSize: 12,
};

function StatCard({
  title,
  value,
}) {
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
