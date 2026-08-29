import { generateWithAI } from "./lib_ai_v3.js";

const MAX_IDEA_LENGTH = 5000;
const MAX_PAGES = 30;
const MAX_FEATURES = 100;

function cleanJson(text) {
  let value = String(text || "").trim();
  value = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Providers occasionally prepend harmless prose despite the JSON-only
  // instruction. Extract the first balanced JSON object without accepting
  // arbitrary trailing provider text.
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
    purpose: cleanText(page.purpose || page.description, "Application page generated from the customer's requirements.").slice(0, 1000),
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
    description: cleanText(feature.description || feature.purpose, "AI-generated application feature.").slice(0, 1000),
  };
}

function normalizeSpecification(raw) {
  if (!raw || typeof raw !== "object" || !raw.specification || typeof raw.specification !== "object") {
    throw new Error("AI returned an invalid application specification.");
  }

  const source = raw.specification;
  const name = cleanText(source.name, "My AI App").slice(0, 200);
  const description = cleanText(source.description, "An AI-generated application based on the customer's requirements.").slice(0, 1500);
  let pages = Array.isArray(source.pages) ? source.pages : [];
  let features = Array.isArray(source.features) ? source.features : [];

  pages = pages.slice(0, MAX_PAGES).map(normalizePage);
  features = features.slice(0, MAX_FEATURES).map(normalizeFeature);

  if (pages.length === 0) {
    pages = [{ name: "Dashboard", purpose: "Main application dashboard generated from the customer's requirements." }];
  }

  return { specification: { name, description, pages, features } };
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

Transform the customer's requirements into a practical application specification.
The customer's requirements are the source of truth. Do not replace the idea with a generic template.

CUSTOMER REQUIREMENTS:
${cleanIdea}

Return ONLY valid JSON using exactly this structure:
{
  "specification": {
    "name": "App name",
    "description": "Short description of the application",
    "pages": [{ "name": "Page name", "purpose": "What this page does" }],
    "features": [{ "name": "Feature name", "description": "What this feature does" }]
  }
}

Rules:
1. Preserve the customer's requested workflow, users, roles, industry and important requirements.
2. Every page and feature must directly support the requested application.
3. Do not add unrelated features merely to make the app look bigger.
4. Create multiple pages when logically required.
5. Return JSON only: no Markdown, explanations, code fences or comments.
6. Do not expose internal AI provider information.
`;

    const result = await generateWithAI(prompt);
    if (!result || typeof result.text !== "string" || !result.text.trim()) throw new Error("AI returned an empty response.");

    let parsed;
    try {
      parsed = JSON.parse(cleanJson(result.text));
    } catch (parseError) {
      console.error("Invalid AI JSON:", parseError);
      throw new Error("AI returned invalid application JSON.");
    }

    return res.status(200).json({
      ...normalizeSpecification(parsed),
      provider: result.provider || "Unknown",
    });
  } catch (error) {
    console.error("AI generation error:", error);
    const status = Number(error?.status) || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: error?.message || "AI generation failed." });
  }
}
