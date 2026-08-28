import { generateWithFallback } from "./ai-provider.js";
import { createClient } from "../lib/supabase/server.js";

function extractJson(text) {
  if (!text) throw new Error("AI provider returned an empty response");
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("AI provider did not return valid JSON");
  try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)); }
  catch { throw new Error("AI provider returned invalid JSON"); }
}

function tokens(idea) {
  return [...new Set(idea.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").split(/\s+/).filter((x) => x.length >= 3).slice(0, 12))];
}

async function loadIndustryPatterns(idea) {
  try {
    const supabase = await createClient();
    const words = tokens(idea);
    let query = supabase.from("industry_patterns").select("name,category,description,app_types,pages,features,workflows,data_model,ui_pattern,design_pattern,special_requirements,keywords").eq("is_active", true).limit(12);
    if (words.length) {
      const clauses = words.flatMap((w) => [`name.ilike.%${w}%`, `category.ilike.%${w}%`, `description.ilike.%${w}%`]);
      query = query.or(clauses.join(","));
    }
    const { data, error } = await query;
    if (error) console.warn("Soolen AI pattern lookup failed:", error.message);
    if (data?.length) return data;
    const fallback = await supabase.from("industry_patterns").select("name,category,description,app_types,pages,features,workflows,data_model,ui_pattern,design_pattern,special_requirements,keywords").eq("is_active", true).limit(8);
    return fallback.data || [];
  } catch (error) {
    console.warn("Soolen AI pattern lookup unavailable:", error?.message);
    return [];
  }
}

function buildPrompt(userIdea, patterns, voiceTranscript = "", referenceImages = []) {
  const patternContext = patterns.length ? JSON.stringify(patterns) : "No matching industry pattern was found; design a new pattern autonomously.";
  return `You are Soolen AI, the autonomous intelligence inside AI App Builder.

USER'S ORIGINAL IDEA (SOURCE OF TRUTH):
"${userIdea}"

VOICE INPUT:
"${voiceTranscript || "None"}"

REFERENCE IMAGES:
${referenceImages.length ? referenceImages.join("\n") : "None"}

INDUSTRY PATTERN LIBRARY MATCHES:
${patternContext}

Your job is to understand the user's actual intent, identify the industry/use case, then intelligently combine relevant industry, UI, feature and workflow patterns. If the idea is unusual or no pattern matches, invent a practical original pattern instead of forcing a generic template.

Learn from established product patterns such as information hierarchy, navigation conventions, dashboards, cards, feeds, booking flows and commerce flows, but create an original implementation. Never copy logos, proprietary text, copyrighted artwork, source code, or distinctive branded assets.

Design the app as a real mobile-first product, not a text-only wireframe. Choose a coherent visual identity: colors, typography direction, spacing, radii, surfaces, icon style, imagery/illustration direction and component treatments appropriate to the industry.

Return ONLY valid JSON. No Markdown or explanations.

Use this structure:
{
  "name":"App name",
  "description":"Short description",
  "industry":{"name":"Industry/use case","category":"Category","confidence":0.0},
  "designSystem":{"mood":"","primaryColor":"","secondaryColor":"","accentColor":"","backgroundColor":"","surfaceColor":"","textColor":"","fontDirection":"","radius":"","iconStyle":"","visualDirection":""},
  "visualAssets":[{"type":"app_icon|illustration|hero|icon_set","description":"Original visual asset direction"}],
  "templateStrategy":{"matchedPatterns":["pattern"],"innovation":"How Soolen AI adapts or creates the pattern"},
  "pages":[{"id":"home","name":"Home","route":"/","description":"What this page does","components":["header","main content"],"layout":"","visualTreatment":""}],
  "features":[{"name":"Feature name","description":"What it does","uiPattern":""}],
  "data":{"EntityName":{"fields":["field1","field2"]}},
  "actions":[{"name":"Action name","description":"What happens"}],
  "navigation":[{"label":"Home","route":"/"}]
}

Rules:
1. The user's idea and voice transcript are the source of truth.
2. Industry patterns are guidance, not restrictions.
3. Match one or more patterns when useful; combine them when the idea spans industries.
4. If no suitable pattern exists, create a new original pattern.
5. Every page has a unique route and the first page is "/".
6. Every page must contain renderable, visually meaningful components.
7. The design system must be specific and appropriate to the app, not generic placeholders.
8. Features, data and actions must support the real workflow.
9. Keep the blueprint practical for Preview, Modify, Test and Publish.
10. Do not expose the underlying AI provider.`;
}

export async function runAutonomousEngine(userIdea, options = {}) {
  if (!userIdea || !userIdea.trim()) throw new Error("Please describe the app you want to build.");
  const idea = userIdea.trim();
  const voiceTranscript = typeof options.voiceTranscript === "string" ? options.voiceTranscript.trim() : "";
  const referenceImages = Array.isArray(options.referenceImages) ? options.referenceImages.filter(Boolean).slice(0, 10) : [];
  const combinedIdea = [idea, voiceTranscript].filter(Boolean).join("\n\n");
  console.log("Soolen AI: starting autonomous app intelligence");
  const patterns = await loadIndustryPatterns(combinedIdea);
  const { provider, result } = await generateWithFallback(buildPrompt(combinedIdea, patterns, voiceTranscript, referenceImages));
  const specification = extractJson(result);
  const model = process.env[`${provider.toUpperCase()}_MODEL`] || undefined;
  console.log("Soolen AI: specification created", { provider, matchedIndustryPatterns: patterns.length });
  return {
    status: "preview_ready",
    idea: combinedIdea,
    specification,
    aiProvider: provider,
    ...(model ? { aiModel: model } : {}),
    intelligence: { engine: "Soolen AI", industryPatternsMatched: patterns.length, patternLibrary: "industry_patterns", voiceInput: Boolean(voiceTranscript), referenceImages: referenceImages.length },
    nextStep: "preview",
    test: { status: "pending" },
    security: { status: "pending" },
    publish: { allowed: false, requiresHumanApproval: true },
  };
}
