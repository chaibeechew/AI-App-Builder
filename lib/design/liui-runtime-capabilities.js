export const LIUI_RUNTIME_CAPABILITY_VERSION = "2026.09-runtime-v1";

export const LIUI_RUNTIME_STATES = Object.freeze([
  "idle",
  "loading",
  "ai-thinking",
  "ai-working",
  "queued",
  "offline",
  "reconnecting",
  "empty",
  "partial",
  "stale",
  "permission-required",
  "approval-required",
  "blocked",
  "error",
  "retry",
  "success",
]);

export const LIUI_RUNTIME_CAPABILITIES = Object.freeze({
  contextIntelligence: true,
  routeAwareIntent: true,
  personalUiMemory: true,
  storesSensitiveProjectIds: false,
  truthfulStateChannel: true,
  offlineAwareness: true,
  routeAnnouncements: true,
  skipNavigation: true,
  keyboardIntentFocus: true,
  reducedMotionRespect: true,
  forcedColorsSupport: true,
  minimumTouchTargetPx: 44,
});

const creationJourney = [
  { pageId: 1, phase: "Idea", label: "Describe" },
  { pageId: 2, phase: "Plan", label: "Plan" },
  { pageId: 3, phase: "Build", label: "Build" },
  { pageId: 4, phase: "Preview", label: "Preview" },
  { pageId: 5, phase: "Launch", label: "Launch" },
  { pageId: 6, phase: "Manage", label: "Manage" },
];

export const LIUI_CREATION_JOURNEY = Object.freeze(creationJourney.map(item => Object.freeze(item)));

const contexts = [
  { pageId: 1, pattern: /^\/$/, surface: "creation", phase: "Idea", name: "Home / Idea", primaryAction: "Describe what you want to create", primaryNav: "Home" },
  { pageId: 2, pattern: /^\/create\/?$/, surface: "creation", phase: "Plan", name: "Create Project / Plan", primaryAction: "Refine the brief and generate a project", primaryNav: "Create" },
  { pageId: 3, pattern: /^\/build-progress(?:\/|$)/, surface: "creation", phase: "Build", name: "Build Progress", primaryAction: "Inspect truthful build progress", primaryNav: "Create" },
  { pageId: 4, pattern: /^\/preview\//, surface: "preview", phase: "Preview", name: "Preview", primaryAction: "Inspect the generated product", primaryNav: "Projects" },
  { pageId: 5, pattern: /^\/release\//, surface: "launch", phase: "Launch", name: "Launch", primaryAction: "Review release readiness", primaryNav: "Projects" },
  { pageId: 6, pattern: /^\/app-dashboard\//, surface: "manage", phase: "Manage", name: "Manage & Grow", primaryAction: "Operate and improve the project", primaryNav: "Projects" },
  { pageId: 7, pattern: /^\/my-apps\/?$/, surface: "creations", phase: "Projects", name: "My Projects", primaryAction: "Resume or create a project", primaryNav: "Projects" },
  { pageId: 8, pattern: /^\/templates\/?$/, surface: "templates", phase: "Discover", name: "Templates", primaryAction: "Choose structural inspiration", primaryNav: "Templates" },
  { pageId: 9, pattern: /^\/soolen-ai\/?$/, surface: "assistant", phase: "Assist", name: "AI Assistant", primaryAction: "Ask or prepare a bounded change", primaryNav: "More" },
  { pageId: 10, pattern: /^\/workflows\/[^/?]+\/?$/, surface: "workflow", phase: "Automate", name: "Automation", primaryAction: "Create or inspect workflows", primaryNav: "Projects" },
  { pageId: 11, pattern: /^\/analytics\//, surface: "analytics", phase: "Understand", name: "Analytics & Growth", primaryAction: "Inspect observed project insights", primaryNav: "Projects" },
  { pageId: 12, pattern: /^\/studio\/?$/, surface: "more", phase: "Configure", name: "More & Settings", primaryAction: "Open account and advanced controls", primaryNav: "More" },
  { pageId: 13, pattern: /^\/editor\//, surface: "editor", phase: "Edit", name: "Project AI Editor", primaryAction: "Apply a versioned AI change", primaryNav: "Projects" },
  { pageId: 14, pattern: /^\/templates\//, surface: "template-detail", phase: "Adapt", name: "Template Detail", primaryAction: "Adapt the template to your project", primaryNav: "Templates" },
  { pageId: 15, pattern: /^\/workflows\/[^/?]+\/?$/, surface: "workflow", phase: "Edit Workflow", name: "Workflow Editor", primaryAction: "Edit, test and activate workflow logic", primaryNav: "Projects", query: "view=editor" },
  { pageId: 16, pattern: /^\/database\//, surface: "database", phase: "Data", name: "Database Manager", primaryAction: "Inspect and safely change project data", primaryNav: "Projects" },
  { pageId: 17, pattern: /^\/operations\//, surface: "quality", phase: "Verify", name: "AI Testing & Self-Heal", primaryAction: "Test, fix and retest with evidence", primaryNav: "Projects" },
  { pageId: 18, pattern: /^\/publish\//, surface: "publish", phase: "Deploy", name: "Publish & Deployment", primaryAction: "Publish only after quality gates pass", primaryNav: "Projects" },
  { pageId: 12, pattern: /^\/(?:image-studio|video-studio|avatar-studio|brand-kit|asset-library|account\/device-compute)\/?$/, surface: "more", phase: "Create", name: "Creative Tools", primaryAction: "Use a focused creator tool", primaryNav: "More" },
];

export const LIUI_ROUTE_CONTEXTS = Object.freeze(contexts.map(item => Object.freeze(item)));

export function resolveLiuiRouteContext(pathname = "", search = "") {
  const safePath = String(pathname || "").split("?")[0] || "/";
  const safeSearch = String(search || "").replace(/^\?/, "");
  if (/^\/workflows\/[^/?]+\/?$/.test(safePath) && new URLSearchParams(safeSearch).get("view") === "editor") {
    return LIUI_ROUTE_CONTEXTS.find(context => context.pageId === 15);
  }
  for (const context of LIUI_ROUTE_CONTEXTS) {
    if (context.query) continue;
    if (context.pattern.test(safePath)) return context;
  }
  return Object.freeze({ pageId: 0, surface: "", phase: "", name: "LANERIQ AI", primaryAction: "", primaryNav: "" });
}

export function getLiuiCreationProgress(pageId) {
  const index = LIUI_CREATION_JOURNEY.findIndex(item => item.pageId === Number(pageId));
  if (index < 0) return null;
  return Object.freeze({
    index,
    current: LIUI_CREATION_JOURNEY[index],
    previous: index > 0 ? LIUI_CREATION_JOURNEY[index - 1] : null,
    next: index < LIUI_CREATION_JOURNEY.length - 1 ? LIUI_CREATION_JOURNEY[index + 1] : null,
    total: LIUI_CREATION_JOURNEY.length,
    percent: Math.round(((index + 1) / LIUI_CREATION_JOURNEY.length) * 100),
  });
}

export function sanitizeLiuiMemory(value) {
  const pageId = Number(value?.pageId || 0);
  const primaryNav = ["Home", "Projects", "Create", "Templates", "More"].includes(value?.primaryNav) ? value.primaryNav : "";
  const phase = String(value?.phase || "").slice(0, 32);
  const timestamp = Number.isFinite(Number(value?.timestamp)) ? Number(value.timestamp) : Date.now();
  return Object.freeze({ pageId: Number.isInteger(pageId) && pageId >= 0 && pageId <= 18 ? pageId : 0, primaryNav, phase, timestamp });
}