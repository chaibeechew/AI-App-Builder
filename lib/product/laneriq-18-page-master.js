export const LANERIQ_18_PAGE_SPEC_VERSION = "2026.09-v3-liui-2026.2";

export const LANERIQ_GLOBAL_NAV = Object.freeze([
  { id: "home", label: "Home", pageId: 1 },
  { id: "projects", label: "Projects", pageId: 7 },
  { id: "create", label: "Create", pageId: 2 },
  { id: "templates", label: "Templates", pageId: 8 },
  { id: "more", label: "More", pageId: 12 },
]);

export const LANERIQ_CORE_CREATION_CHAIN = Object.freeze([1, 2, 3, 4, 5, 6]);
export const LANERIQ_POWER_WORKSPACE_CHAIN = Object.freeze([13, 17, 18]);
export const LANERIQ_REAL_EXECUTION_CHAIN = Object.freeze([1, 2, 3, 13, 17, 18]);
export const LANERIQ_APPROVED_CREATION_JOURNEY = Object.freeze(["Idea", "Plan", "Build", "Preview", "Launch", "Manage"]);
export const LANERIQ_APPROVED_HOME_STACK = Object.freeze(["Hero", "Intent Composer", "Create Image / Design UI", "Style", "Templates", "Build CTA"]);

const sharedStates = Object.freeze([
  "idle", "loading", "ai-thinking", "ai-working", "queued", "offline",
  "permission-required", "error", "retry", "success",
]);

const pages = [
  {
    id:1, slug:"home", name:"Home / Idea", route:"/", routeFile:"app/page.js",
    purpose:"Capture the user's intent and start creation without making the user hunt through menus.",
    primaryAction:"Start a new App + Website build",
    userActions:["type idea","expand long prompt","upload reference","voice idea","photo/video reference","choose style","choose template","create image","design image"],
    aiActions:["understand intent","suggest prompt improvements","prepare references","preserve user-controlled visual direction"],
    data:["session","style preference","reference asset metadata"], risk:"low", humanApproval:false, evidence:"production-surface",
  },
  {
    id:2, slug:"create-project", name:"Create Project / Plan", route:"/?flow=create-project", routeFile:"app/page.js",
    purpose:"Turn the raw idea into an explicit project brief and controlled build plan.", primaryAction:"Generate Project",
    userActions:["edit project brief","choose App/Web target","choose language","choose automation","approve AI Project Guard"],
    aiActions:["improve prompt","plan architecture","select industry/template intelligence","plan pages/features/data/workflows"],
    data:["project brief","template intelligence","project memory seed"], risk:"medium", humanApproval:true, evidence:"code-ci-before-live-provider",
  },
  {
    id:3, slug:"build-progress", name:"Build Progress", route:"/?flow=build-progress", routeFile:"app/page.js",
    purpose:"Expose truthful generation progress while LANERIQ builds, validates and persists the project.", primaryAction:"Continue in background / Open result",
    userActions:["view progress","run in background","open build details","retry safely"],
    aiActions:["generate pages","generate features","connect data","prepare workflows","run security checks","prepare preview"],
    data:["generation request","idempotency key","build progress","generated project id"], risk:"medium", humanApproval:false, evidence:"runtime-progress-must-not-fake-completion",
  },
  {
    id:4, slug:"preview", name:"Preview", route:"/preview/[id]", routeFile:"app/preview/[id]/page.js",
    purpose:"Let the user inspect the generated product before release actions are allowed.", primaryAction:"Approve preview or return to edit",
    userActions:["switch device preview","inspect pages","open editor","approve preview"],
    aiActions:["surface preview issues","explain generated structure","recommend non-destructive improvements"],
    data:["project","current version","preview artifact"], risk:"low", humanApproval:true, evidence:"browser-preview",
  },
  {
    id:5, slug:"launch", name:"Launch", route:"/release/[id]", routeFile:"app/release/[id]/page.js",
    purpose:"Choose release targets and prepare release checks without implying store or provider LIVE status prematurely.", primaryAction:"Prepare release",
    userActions:["choose Web/iOS/Android/Desktop","review readiness","continue to publish center"],
    aiActions:["prepare target checklist","identify missing release requirements","never claim store approval before evidence exists"],
    data:["release target","readiness checks","store preparation metadata"], risk:"high", humanApproval:true, evidence:"release-ready-is-not-store-live",
  },
  {
    id:6, slug:"manage-grow", name:"Manage & Grow", route:"/app-dashboard/[id]", routeFile:"app/app-dashboard/[id]/page.js",
    purpose:"Operate a released or saved project, inspect health and growth, and return to editing safely.", primaryAction:"Open project workspace",
    userActions:["inspect project","open analytics","open editor","review AI suggestions"],
    aiActions:["summarize meaningful changes","recommend optimizations","wait for approval before live changes"],
    data:["owned project","analytics aggregates","release status"], risk:"medium", humanApproval:true, evidence:"real-data-only-for-live-metrics",
  },
  {
    id:7, slug:"my-projects", name:"My Projects / Creations", route:"/my-apps", routeFile:"app/my-apps/page.js",
    purpose:"Give the user one authoritative place to resume, inspect or create projects.", primaryAction:"Open / Continue / New Project",
    userActions:["search","filter","open","continue","preview","create new"],
    aiActions:["rank recent/important projects","surface interrupted builds","avoid duplicate recovery builds"],
    data:["owned projects","versions","build status"], risk:"low", humanApproval:false, evidence:"supabase-owner-scoped",
  },
  {
    id:8, slug:"templates", name:"Templates", route:"/templates", routeFile:"app/templates/page.js",
    purpose:"Expose LANERIQ's industry templates and popular design references as generation intelligence, not clones.", primaryAction:"Open template / Build with AI",
    userActions:["search","filter industry","open template","start build"],
    aiActions:["use 3000+ LANERIQ templates as structural reference","use popular app patterns only as secondary inspiration","apply anti-clone rules"],
    data:["template catalog","industry patterns","UI patterns"], risk:"low", humanApproval:false, evidence:"template-intelligence",
  },
  {
    id:9, slug:"ai-assistant", name:"AI Assistant", route:"/soolen-ai", routeFile:"app/soolen-ai/page.js",
    purpose:"Provide a universal AI command layer across creation and project operations.", primaryAction:"Execute or prepare an AI command",
    userActions:["ask","modify","add feature","optimize","fix issue"],
    aiActions:["understand project context","propose bounded changes","request confirmation for risky actions","record version before destructive change"],
    data:["project context","project memory","version history"], risk:"medium", humanApproval:true, evidence:"command-layer",
  },
  {
    id:10, slug:"automation", name:"Automation", route:"/workflows/[id]?view=overview", routeFile:"app/workflows/[id]/page.js",
    purpose:"Create and operate project automations with explicit triggers, conditions, actions and safe execution boundaries.", primaryAction:"Create Workflow",
    userActions:["create workflow","enable/disable","test","inspect runs"],
    aiActions:["generate bounded workflow","validate ownership","explain risky actions","avoid external spend unless explicitly allowed"],
    data:["app_workflows","workflow_runs"], risk:"high", humanApproval:true, evidence:"workflow-runtime",
  },
  {
    id:11, slug:"analytics-growth", name:"Analytics & Growth", route:"/analytics/[id]", routeFile:"app/analytics/[id]/page.js",
    purpose:"Show privacy-safe, owner-scoped project analytics and actionable growth insights.", primaryAction:"Inspect insight / Open project",
    userActions:["inspect project analytics","review activity","return to project"],
    aiActions:["summarize trends","separate observed data from prediction","avoid invented revenue/users"],
    data:["analytics_events","owner-scoped aggregates"], risk:"medium", humanApproval:false, evidence:"real-data-required",
  },
  {
    id:12, slug:"more-settings", name:"More & Settings", route:"/studio", routeFile:"app/studio/page.js",
    purpose:"Centralize account, AI engine, data, privacy, help and advanced product controls.", primaryAction:"Open selected setting",
    userActions:["account","security","billing","preferences","providers","brand kit","database","domains","help"],
    aiActions:["explain settings","preserve least privilege","never expose secrets"],
    data:["account settings","provider readiness metadata","brand kit","privacy preferences"], risk:"high", humanApproval:true, evidence:"settings-permission-boundary",
  },
  {
    id:13, slug:"project-ai-editor", name:"Project Detail / AI Editor", route:"/editor/[id]", routeFile:"app/editor/[id]/page.js",
    purpose:"Act as the daily project workspace for editing, versioning, validating and continuing toward publish.", primaryAction:"Apply AI change safely",
    userActions:["edit","preview","undo","compare","open data","open automation","test","publish"],
    aiActions:["modify from natural language","persist a new version","preserve ownership","run validation","offer undo"],
    data:["apps","app_versions","project_memory","generated specification"], risk:"high", humanApproval:true, evidence:"versioned-editing",
  },
  {
    id:14, slug:"template-detail", name:"Template Detail", route:"/templates/[id]", routeFile:"app/templates/[id]/page.js",
    purpose:"Explain what a template contains and adapt it to the user's business before generation.", primaryAction:"Use Template / Build with AI",
    userActions:["preview","inspect features","adapt prompt","choose platform/style/language","build"],
    aiActions:["adapt template without cloning","merge user brand and requirements","explain generated pages/features/data/workflows"],
    data:["template","industry intelligence","user adaptation brief"], risk:"medium", humanApproval:true, evidence:"template-adaptation",
  },
  {
    id:15, slug:"workflow-editor", name:"Workflow Editor", route:"/workflows/[id]?view=editor", routeFile:"app/workflows/[id]/page.js",
    purpose:"Edit triggers, conditions, actions and AI-assisted workflow logic within the owned project.", primaryAction:"Save & Activate",
    userActions:["add workflow","test","save","activate","inspect run history"],
    aiActions:["generate workflow from language","validate workflow","simulate safely","require confirmation for risky integrations"],
    data:["app_workflows","workflow_runs","integration references"], risk:"high", humanApproval:true, evidence:"workflow-editor-runtime",
  },
  {
    id:16, slug:"database-manager", name:"Database Manager", route:"/database/[id]", routeFile:"app/database/[id]/page.js",
    purpose:"Manage project data models, records and relationships without exposing infrastructure secrets.", primaryAction:"Apply safe schema/data change",
    userActions:["inspect schema","inspect records","create relation","query","backup","restore"],
    aiActions:["propose schema","validate migration","enforce ownership/RLS","preview destructive changes","require approval"],
    data:["app_backend_models","project data","RLS metadata"], risk:"critical", humanApproval:true, evidence:"database-ownership-security",
  },
  {
    id:17, slug:"ai-testing-self-heal", name:"AI Testing & Self-Heal", route:"/operations/[id]", routeFile:"app/operations/[id]/page.js",
    purpose:"Run product, security, accessibility, performance and LIUI tests; self-heal bounded issues and retest.", primaryAction:"Run Tests / Apply Safe Fixes",
    userActions:["run tests","inspect failures","approve fix","retest","compare evidence"],
    aiActions:["test","classify issue","self-heal safe issues","retest","block release on hard failures","never downgrade gates to pass"],
    data:["test evidence","quality judge","release readiness","version history"], risk:"critical", humanApproval:true, evidence:"code-ci-browser-provider-device-store-separated",
  },
  {
    id:18, slug:"publish-deployment-center", name:"Publish & Deployment Center", route:"/publish/[id]", routeFile:"app/publish/[id]/page.js",
    purpose:"Prepare and execute controlled Web/iOS/Android/Desktop release operations after quality gates pass.", primaryAction:"Publish / Deploy",
    userActions:["select target","review domain/hosting","review store readiness","publish","rollback","inspect deployment history"],
    aiActions:["verify release gate","prepare deployment","never expose secrets","require explicit confirmation","record deployment evidence","support rollback"],
    data:["publish_requests","store_listings","deployment evidence","release version"], risk:"critical", humanApproval:true, evidence:"production-exact-sha-plus-runtime-evidence",
  },
];

export const LANERIQ_18_PAGES = Object.freeze(pages.map(page => Object.freeze({ ...page, states: sharedStates })));
export const LANERIQ_18_PAGE_BY_ID = Object.freeze(Object.fromEntries(LANERIQ_18_PAGES.map(page => [page.id, page])));
export const LANERIQ_18_PAGE_BY_SLUG = Object.freeze(Object.fromEntries(LANERIQ_18_PAGES.map(page => [page.slug, page])));

export const LANERIQ_18_PAGE_AI_RULES = Object.freeze({
  intentFirst:true,
  humanInControl:true,
  neverFakeCompletion:true,
  neverFakeLiveProvider:true,
  neverFakeStoreApproval:true,
  neverInventAnalytics:true,
  preserveOwnershipAndRls:true,
  versionBeforeRiskyMutation:true,
  confirmHighRiskActions:true,
  selfHealMayNotLowerQualityGates:true,
  secretsStayServerSide:true,
  rawPromptsExcludedFromOutcomeLearning:true,
  smsOnHold:true,
});

export const LANERIQ_18_PAGE_DESIGN_RULES = Object.freeze({
  standard:"LANERIQ AI Living Intelligence UI / LIUI-2026.2",
  intentFirst:true,
  contextAdaptive:true,
  adaptiveBento:true,
  livingCards:true,
  liquidIntelligenceGlass:true,
  semanticMotion:true,
  voiceNative:true,
  universalAiCommandLayer:true,
  personalUiMemory:true,
  legacyBigMoonValleyActive:false,
  homeFirstPaint:"Future City + People",
  homeStructure:LANERIQ_APPROVED_HOME_STACK,
  creationJourney:LANERIQ_APPROVED_CREATION_JOURNEY,
  photoBackgrounds:"contextual, adaptive and readability-protected",
  glassPanels:"selective semi-transparent glass; never an all-page glass sheet",
  longPromptBehavior:"expand into large editor",
  primaryPromptSurface:"light/warm input area for readability",
  bottomNavigation:LANERIQ_GLOBAL_NAV,
});

export function resolveMasterProductPage(idOrSlug){
  if(typeof idOrSlug === "number") return LANERIQ_18_PAGE_BY_ID[idOrSlug] || null;
  const numeric = Number(idOrSlug);
  if(Number.isInteger(numeric) && LANERIQ_18_PAGE_BY_ID[numeric]) return LANERIQ_18_PAGE_BY_ID[numeric];
  return LANERIQ_18_PAGE_BY_SLUG[String(idOrSlug || "").trim()] || null;
}
