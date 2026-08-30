import { generateWithAI } from "./lib_ai_v3.js";
import { assessBuildQuality, GENERATION_QUALITY_RULES } from "../lib/buildStandards.js";

const MAX_IDEA_LENGTH = 5000;
const MAX_PAGES = 30;
const MAX_FEATURES = 100;

function extractJsonObject(text) {
  let value = String(text || "").trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = value.indexOf("{");
  if (start < 0) return value;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < value.length; i += 1) {
    const char = value[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, i + 1).trim();
    }
  }
  return value;
}

function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizePage(page, index) {
  if (!page || typeof page !== "object") {
    return { name: `Page ${index + 1}`, purpose: "Application page generated from the customer's requirements." };
  }
  return {
    name: cleanText(page.name, `Page ${index + 1}`).slice(0, 200),
    purpose: cleanText(page.purpose || page.description, "Application page generated from the customer's requirements.").slice(0, 1200),
  };
}

function normalizeFeature(feature, index) {
  if (typeof feature === "string") {
    return { name: feature.trim().slice(0, 200) || `Feature ${index + 1}`, description: "AI-generated application feature." };
  }
  if (!feature || typeof feature !== "object") {
    return { name: `Feature ${index + 1}`, description: "AI-generated application feature." };
  }
  return {
    name: cleanText(feature.name, `Feature ${index + 1}`).slice(0, 200),
    description: cleanText(feature.description || feature.purpose, "AI-generated application feature.").slice(0, 1200),
  };
}

function looksLikePlaceholder(spec) {
  const name = String(spec?.name || "").trim().toLowerCase();
  const description = String(spec?.description || "").trim().toLowerCase();
  const firstPageName = String(spec?.pages?.[0]?.name || "").trim().toLowerCase();
  const firstPagePurpose = String(spec?.pages?.[0]?.purpose || "").trim().toLowerCase();

  return (
    !name ||
    ["app name", "my ai app"].includes(name) ||
    ["short description", "short description of the application"].includes(description) ||
    firstPageName === "page name" ||
    firstPagePurpose === "what this page does"
  );
}

function normalizeSpecification(raw) {
  if (!raw || typeof raw !== "object" || !raw.specification || typeof raw.specification !== "object") {
    throw new Error("AI returned an invalid application specification.");
  }

  const source = raw.specification;
  const name = cleanText(source.name, "My AI App").slice(0, 200);
  const description = cleanText(source.description, "An AI-generated application based on the customer's requirements.").slice(0, 1800);
  let pages = Array.isArray(source.pages) ? source.pages : [];
  let features = Array.isArray(source.features) ? source.features : [];

  pages = pages.slice(0, MAX_PAGES).map(normalizePage);
  features = features.slice(0, MAX_FEATURES).map(normalizeFeature);

  if (pages.length === 0) throw new Error("AI returned an incomplete application specification.");

  const specification = { name, description, pages, features };
  if (looksLikePlaceholder(specification)) {
    throw new Error("AI returned placeholder content instead of a real application specification.");
  }

  return specification;
}

function parseAIResponse(text) {
  return JSON.parse(extractJsonObject(text));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const idea = req.body?.idea;
    if (typeof idea !== "string" || !idea.trim()) return res.status(400).json({ error: "Please provide an app idea." });

    const cleanIdea = idea.trim();
    if (cleanIdea.length > MAX_IDEA_LENGTH) {
      return res.status(413).json({ error: `App idea is too long. Maximum ${MAX_IDEA_LENGTH} characters.` });
    }

    const prompt = `
You are the core application-planning engine of AI App Builder.

Transform the customer's requirements into a practical, specific application specification for an original App + Website.
The customer's requirements are the source of truth. Do not replace the idea with a generic template.

CUSTOMER REQUIREMENTS:
${cleanIdea}

${GENERATION_QUALITY_RULES}

Return ONLY one valid JSON object using exactly this structure:
{
  "specification": {
    "name": "Real application name",
    "description": "Real application description",
    "pages": [{ "name": "Real page name", "purpose": "Real page purpose including important usability/privacy/security behavior when relevant" }],
    "features": [{ "name": "Real feature name", "description": "Real feature description including important validation/access/privacy behavior when relevant" }]
  }
}

Rules:
1. Preserve the customer's requested workflow, users, roles, industry and important requirements.
2. Every page and feature must directly support the requested application.
3. Create multiple pages when logically required.
4. Include practical safeguards instead of vague claims such as "secure" or "private".
5. Do not return placeholders such as "App name", "Page name", "What this page does" or "Short description".
6. Return JSON only: no Markdown, explanations, code fences or comments.
7. Do not expose internal AI provider information.
8. References, templates and uploaded materials are inspiration inputs only; do not copy third-party branding, text, images, source code or distinctive layouts.
`;

    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await generateWithAI(
          attempt === 1
            ? prompt
            : `${prompt}\n\nIMPORTANT RETRY: The previous output was invalid or generic. Return STRICT JSON ONLY with a real app name, real pages, real purposes and concrete quality safeguards. Start with { and end with }.`
        );

        if (!result || typeof result.text !== "string" || !result.text.trim()) {
          throw new Error("AI returned an empty response.");
        }

        const parsed = parseAIResponse(result.text);
        const specification = normalizeSpecification(parsed);
        const quality = assessBuildQuality(specification);

        return res.status(200).json({
          specification,
          quality,
          provider: result.provider || "Unknown",
        });
      } catch (error) {
        lastError = error;
        console.error(`AI generation attempt ${attempt} failed:`, error);
      }
    }

    throw lastError || new Error("AI generation failed.");
  } catch (error) {
    console.error("AI generation error:", error);
    const status = Number(error?.status) || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: error?.message || "AI generation failed." });
  }
}
