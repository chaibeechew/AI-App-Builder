// Soolen AI capability catalog and fail-closed entitlement resolver.
// This describes Soolen-owned orchestration. It does not copy third-party models,
// subscriptions, private tools, or provider credentials.

import { filterProvidersByCost, getSoolenCostMode, zeroCostPolicy, zeroCostProviders } from "./cost-policy.js";

const LEVEL = Object.freeze({ free: 0, pro: 1, business: 2 });

export const SOOLEN_CAPABILITY_VERSION = "1.0.0";

export const SOOLEN_CAPABILITIES = Object.freeze([
  { id:"multilingual-chat", category:"Think & Create", name:"Multilingual AI conversation", description:"Discuss, plan, write, translate and refine work in the user's language.", minimumTier:"free", readiness:"text" },
  { id:"advanced-reasoning", category:"Think & Create", name:"Advanced multi-model reasoning", description:"Use stronger authorized models, deeper analysis and provider fallback for complex tasks.", minimumTier:"pro", readiness:"premiumText" },
  { id:"app-website-builder", category:"Build", name:"App + Customer Website builder", description:"Plan, generate, test, preview, modify and package an app and its customer website together.", minimumTier:"free", readiness:"text" },
  { id:"coding-agent", category:"Build", name:"Coding and repair agent", description:"Create code, run structured checks, repair failures and keep version history.", minimumTier:"free", readiness:"text" },
  { id:"visual-understanding", category:"Images", name:"Photo, screenshot and sketch understanding", description:"Extract layout, aspect, light/dark balance and palette without identifying private people.", minimumTier:"free", readiness:"local" },
  { id:"local-image-creation", category:"Images", name:"Original local visual creation", description:"Create original icons, hero artwork and backgrounds using Soolen's programmatic engine.", minimumTier:"free", readiness:"local" },
  { id:"premium-image-studio", category:"Images", name:"Premium image generation and editing", description:"Use an authorized multimodal provider for higher-fidelity generation and edits.", minimumTier:"pro", readiness:"premiumImage", planned:true },
  { id:"browser-voice", category:"Voice", name:"Multilingual browser voice", description:"Speak an idea and hear it read back using voices available on the user's device.", minimumTier:"free", readiness:"browser" },
  { id:"cloud-transcription", category:"Voice", name:"High-accuracy cloud transcription", description:"Transcribe longer recordings with an authorized speech provider.", minimumTier:"pro", readiness:"transcription" },
  { id:"premium-neural-voice", category:"Voice", name:"Soolen multilingual neural voice", description:"Generate consistent multilingual speech through an approved, configured voice service.", minimumTier:"pro", readiness:"premiumVoice" },
  { id:"video-storyboard", category:"Video", name:"Demo storyboard and browser video", description:"Plan a product demo and create browser-local preview media.", minimumTier:"free", readiness:"local" },
  { id:"premium-video-studio", category:"Video", name:"Full video generation and editing", description:"Generate or transform video through an authorized render provider or Soolen worker.", minimumTier:"pro", readiness:"premiumVideo" },
  { id:"project-memory", category:"Workspace", name:"Projects, versions and rollback", description:"Keep each app project, its generated versions and controlled rollback history.", minimumTier:"free", readiness:"local" },
  { id:"live-web-research", category:"Knowledge", name:"Live web research with sources", description:"Retrieve current public information through a separately authorized search provider.", minimumTier:"pro", readiness:"web", planned:true },
  { id:"document-workspace", category:"Files", name:"Documents, PDF, sheets and slides", description:"Read, create and revise common work files inside a permission-scoped project.", minimumTier:"pro", readiness:"documents", planned:true },
  { id:"scheduled-work", category:"Actions", name:"Scheduled and conditional tasks", description:"Run user-approved checks and reminders with clear scope and controls.", minimumTier:"business", readiness:"automations", planned:true },
  { id:"connected-actions", category:"Actions", name:"Authorized app connectors", description:"Work with connected services only after the user grants each required permission.", minimumTier:"business", readiness:"connectors", planned:true },
]);

function enabled(name, env) {
  return Boolean(env[name]);
}

function providerState(env = process.env) {
  const costMode = getSoolenCostMode(env);
  const configuredTextProviders = [
    ["gateway", enabled("AI_GATEWAY_API_KEY", env) && enabled("AI_GATEWAY_MODEL", env)],
    ["gemini", enabled("GEMINI_API_KEY", env)],
    ["groq", enabled("GROQ_API_KEY", env)],
    ["cerebras", enabled("CEREBRAS_API_KEY", env)],
    ["deepseek", enabled("DEEPSEEK_API_KEY", env)],
    ["mistral", enabled("MISTRAL_API_KEY", env)],
    ["together", enabled("TOGETHER_API_KEY", env)],
    ["openrouter", enabled("OPENROUTER_API_KEY", env)],
    ["xai", enabled("XAI_API_KEY", env)],
    ["openai", enabled("OPENAI_API_KEY", env)],
    ["ollama", enabled("OLLAMA_BASE_URL", env)],
    ["soolen-local", true],
  ].filter(([, ready]) => ready).map(([provider]) => provider);

  const freeDefault = costMode === "zero" ? zeroCostProviders(env) : ["gemini","groq","cerebras","ollama","soolen-local"];
  const paidDefault = costMode === "zero" ? zeroCostProviders(env) : ["gateway","openai","xai","deepseek","mistral","together","openrouter","gemini","groq","cerebras","ollama","soolen-local"];
  const split = (value, fallback) => String(value || fallback.join(",")).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const selectedFree = filterProvidersByCost(split(env.SOOLEN_FREE_PROVIDERS, freeDefault), env).filter((provider) => configuredTextProviders.includes(provider));
  const selectedPaid = filterProvidersByCost(split(env.SOOLEN_PAID_PROVIDERS, paidDefault), env).filter((provider) => configuredTextProviders.includes(provider));
  const openVoiceReady = Boolean(env.SOOLENAI_TTS_URL && env.SOOLENAI_VOICE_SAMPLE_URL);

  return {
    costMode,
    configuredTextProviders,
    freeTextProviders: selectedFree,
    paidTextProviders: selectedPaid,
    premiumText: costMode === "zero" ? selectedPaid.includes("ollama") : selectedPaid.some((provider) => provider !== "soolen-local"),
    premiumImage: costMode === "zero" ? false : Boolean(env.SOOLEN_IMAGE_PROVIDER_URL || (env.AI_GATEWAY_API_KEY && env.SOOLEN_IMAGE_MODEL)),
    transcription: costMode === "zero" ? Boolean(env.SOOLEN_STT_URL) : Boolean(env.OPENAI_API_KEY || env.SOOLEN_STT_URL),
    premiumVoice: costMode === "zero" ? openVoiceReady : Boolean(openVoiceReady || (env.ELEVENLABS_API_KEY && env.SOOLENAI_VOICE_ID)),
    premiumVideo: costMode === "zero" ? false : Boolean(env.SOOLEN_VIDEO_RUNTIME_URL || env.SOOLEN_VIDEO_EXECUTOR_URL || env.SOOLEN_VIDEO_PROVIDER_URL),
    web: costMode === "zero" ? false : Boolean(env.SOOLEN_WEB_SEARCH_URL || env.TAVILY_API_KEY || env.PERPLEXITY_API_KEY),
    documents: Boolean(env.SOOLEN_DOCUMENT_WORKER_URL),
    automations: costMode === "zero" ? false : Boolean(env.SOOLEN_AUTOMATION_WORKER_URL),
    connectors: Boolean(env.SOOLEN_CONNECTOR_BROKER_URL),
  };
}

export function planTier(planCode, subscriptionStatus) {
  if (!["active","trialing"].includes(String(subscriptionStatus || "").toLowerCase())) return "free";
  const code = String(planCode || "").toLowerCase();
  if (/business|team|enterprise/.test(code)) return "business";
  return "pro";
}

export function resolveSoolenCapabilities({ tier = "free", env = process.env } = {}) {
  const normalizedTier = LEVEL[tier] === undefined ? "free" : tier;
  const providers = providerState(env);
  const selectedTextProviders = normalizedTier === "free" ? providers.freeTextProviders : providers.paidTextProviders;
  const readiness = {
    local: true,
    browser: true,
    text: selectedTextProviders.length > 0,
    premiumText: providers.premiumText,
    premiumImage: providers.premiumImage,
    transcription: providers.transcription,
    premiumVoice: providers.premiumVoice,
    premiumVideo: providers.premiumVideo,
    web: providers.web,
    documents: providers.documents,
    automations: providers.automations,
    connectors: providers.connectors,
  };

  const capabilities = SOOLEN_CAPABILITIES.map((capability) => {
    const entitled = LEVEL[normalizedTier] >= LEVEL[capability.minimumTier];
    const configured = Boolean(readiness[capability.readiness]);
    const status = !entitled
      ? "upgrade_required"
      : capability.planned
        ? (configured ? "integration_ready" : "planned")
        : configured ? "ready" : "setup_required";
    return { ...capability, entitled, configured, status };
  });

  return {
    version: SOOLEN_CAPABILITY_VERSION,
    tier: normalizedTier,
    capabilities,
    providers: {
      text: selectedTextProviders,
      count: providers.configuredTextProviders.length,
      premiumRouting: normalizedTier !== "free" && providers.premiumText,
      costMode: providers.costMode,
    },
    policy: {
      thirdPartyModelsCopied: false,
      requiresAuthorizedProvider: true,
      paidFeaturesRequireActiveSubscription: true,
      failClosed: true,
      ...zeroCostPolicy(env),
    },
  };
}
