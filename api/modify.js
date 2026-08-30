import { generateWithAI } from "./lib_ai.js";
import { assessBuildQuality, GENERATION_QUALITY_RULES } from "../lib/buildStandards.js";

const MAX_INSTRUCTION_LENGTH = 5000;
const MAX_SPECIFICATION_LENGTH = 50000;
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
    description === "short description" ||
    description === "short description of the application" ||
    firstPageName === "page name" ||
    firstPagePurpose === "what this page does"
  );
}

function normalizeSpecification(raw) {
  if (!raw || typeof raw !== "object") throw new Error("AI returned an invalid application specification.");

  const source = raw.specification && typeof raw.specification === "object" ? raw.specification : raw;
  const name = cleanText(source.name, "My AI App").slice(0, 200);
  const description = cleanText(source.description, "An AI-generated application based on the customer's requirements.").slice(0, 1800);
  let pages = Array.isArray(source.pages) ? source.pages : [];
  let features = Array.isArray(source.features) ? source.features : [];

  pages = pages.slice(0, MAX_PAGES).map(normalizePage);
  features = features.slice(0, MAX_FEATURES).map(normalizeFeature);
  if (pages.length === 0) throw new Error("AI returned an incomplete application specification.");

  const normalized = { name, description, pages, features };
  if (looksLikePlaceholder(normalized)) throw new Error("AI returned placeholder content instead of a real application specification.");
  return normalized;
}

function parseAIResponse(text) {
  const candidate = extractJsonObject(text);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const wrapped = candidate.match(/\{[\s\S]*\}/)?.[0];
    if (wrapped && wrapped !== candidate) {
      try { return JSON.parse(wrapped); } catch {}
    }
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const instruction = req.body?.instruction;
    const specification = req.body?.specification;

    if (typeof instruction !== "string" || !instruction.trim()) {
      return res.status(400).json({ error: "Please provide a modification instruction." });
    }

    const cleanInstruction = instruction.trim();
    if (cleanInstruction.length > MAX_INSTRUCTION_LENGTH) {
      return res.status(413).json({ error: `Modification instruction is too long. Maximum ${MAX_INSTRUCTION_LENGTH} characters.` });
    }

    if (!specification || typeof specification !== "object") {
      return res.status(400).json({ error: "A valid app specification is required." });
    }

    const specificationText = JSON.stringify(specification);
    if (specificationText.length > MAX_SPECIFICATION_LENGTH) {
      return res.status(413).json({ error: "The application specification is too large to modify." });
    }

    const prompt = `
You are the AI modification engine of AI App Builder.

Modify the existing application according to the customer's latest instruction.
Preserve everything unrelated to the requested change, including useful stability, security, privacy, comfort, beauty and naturalness safeguards.

CUSTOMER MODIFICATION REQUEST:
${cleanInstruction}

CURRENT APPLICATION SPECIFICATION:
${specificationText}

${GENERATION_QUALITY_RULES}

Return ONLY one valid JSON object with exactly this structure:
{
  "specification": {
    "name": "Real application name",
    "description": "Real application description",
    "pages": [{ "name": "Real page name", "purpose": "Real page purpose including important usability/privacy/security behavior when relevant" }],
    "features": [{ "name": "Real feature name", "description": "Real feature description including important validation/access/privacy behavior when relevant" }]
  }
}

Rules:
1. Apply the customer's requested change accurately, including instructions written in Chinese or any other language.
2. Preserve unrelated pages and features.
3. Do not remove meaningful privacy, security, validation or recovery behavior unless the customer explicitly asks for a compatible redesign.
4. Do not return placeholders such as "App name", "Page name", "What this page does" or "Short description".
5. Do not return Markdown, prose, explanations, comments or code fences before or after the JSON.
6. Return the complete updated specification, not a partial patch.
7. Do not expose provider, routing, API key or system information.
8. Reference materials and templates are inspiration only; do not copy third-party branding, text, images, source code or distinctive layouts.
`;

    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await generateWithAI(
          attempt === 1
            ? prompt
            : `${prompt}\n\nIMPORTANT RETRY: Your previous response could not be parsed. Return STRICT JSON ONLY. Start with { and end with }. No sentence before or after it.`
        );

        if (!result || typeof result.text !== "string" || !result.text.trim()) {
          throw new Error("AI returned an empty response.");
        }

        const parsed = parseAIResponse(result.text);
        const normalized = normalizeSpecification(parsed);
        return res.status(200).json({
          specification: normalized,
          quality: assessBuildQuality(normalized),
          provider: result.provider || "Unknown",
        });
      } catch (error) {
        lastError = error;
        console.error(`AI modification attempt ${attempt} failed:`, error);
      }
    }

    throw lastError || new Error("AI modification failed.");
  } catch (error) {
    console.error("AI modification error:", error);
    const status = Number(error?.status) || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: error?.message || "AI modification failed.",
    });
  }
}
