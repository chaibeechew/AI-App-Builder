import { generateWithAI } from "./lib_ai_v3.js";

const MAX_IDEA_LENGTH = 5000;
const MAX_PAGES = 30;
const MAX_FEATURES = 100;


// ============================================
// JSON CLEANER
// ============================================

function cleanJson(text) {
  let value = String(text || "").trim();

  value = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return value;
}


// ============================================
// VALIDATION HELPERS
// ============================================

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}


function normalizePage(page, index) {
  if (!page || typeof page !== "object") {
    return {
      name: `Page ${index + 1}`,
      purpose: "Application page generated from the customer's requirements.",
    };
  }

  return {
    name: cleanText(page.name, `Page ${index + 1}`).slice(0, 200),
    purpose: cleanText(page.purpose || page.description, "Application page generated from the customer's requirements.").slice(0, 1000),
  };
}


function normalizeFeature(feature, index) {
  if (typeof feature === "string") {
    return {
      name: feature.trim().slice(0, 200) || `Feature ${index + 1}`,
      description: "AI-generated application feature.",
    };
  }

  if (!feature || typeof feature !== "object") {
    return {
      name: `Feature ${index + 1}`,
      description: "AI-generated application feature.",
    };
  }

  return {
    name: cleanText(feature.name, `Feature ${index + 1}`).slice(0, 200),
    description: cleanText(feature.description || feature.purpose, "AI-generated application feature.").slice(0, 1000),
  };
}


// ============================================
// SPECIFICATION VALIDATION
// ============================================

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


// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const idea = req.body?.idea;

    if (typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ error: "Please provide an app idea." });
    }

    const cleanIdea = idea.trim();

    if (cleanIdea.length > MAX_IDEA_LENGTH) {
      return res.status(413).json({ error: `App idea is too long. Maximum ${MAX_IDEA_LENGTH} characters.` });
    }

    const prompt = `
You are the core application-planning engine of AI App Builder.

Your task is to understand the customer's requirements and transform them into a practical application specification.

IMPORTANT:
The customer's requirements are the source of truth.

Do not replace the customer's idea with a generic template.

Create the application structure specifically for what the customer requested.

CUSTOMER REQUIREMENTS:
${cleanIdea}

Return ONLY valid JSON.

Use exactly this structure:

{
  "specification": {
    "name": "App name",
    "description": "Short description of the application",
    "pages": [
      { "name": "Page name", "purpose": "What this page does" }
    ],
    "features": [
      { "name": "Feature name", "description": "What this feature does" }
    ]
  }
}

RULES:
1. Understand the customer's requirements before designing the application.
2. Every page must have a clear purpose related to the customer's requirements.
3. Every feature must be useful for the customer's requested application.
4. Do not add unrelated features simply to make the application look bigger.
5. Create multiple pages when the customer's requirements logically require multiple pages.
6. If the customer requests a specific workflow, preserve that workflow.
7. If the customer requests a specific industry, design the application for that industry.
8. If the customer requests specific users or roles, reflect them in the application structure.
9. Do not return Markdown.
10. Do not return explanations.
11. Do not return code fences.
12. Do not include comments.
13. Return JSON only.
14. The result must be practical enough for the next stage of AI App Builder to generate the application.
15. Do not expose internal AI provider information inside the application specification.
`;

    const result = await generateWithAI(prompt);

    if (!result || typeof result.text !== "string" || !result.text.trim()) {
      throw new Error("AI returned an empty response.");
    }

    const cleaned = cleanJson(result.text);
    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Invalid AI JSON:", parseError);
      throw new Error("AI returned invalid application JSON.");
    }

    const normalized = normalizeSpecification(parsed);

    return res.status(200).json({
      ...normalized,
      provider: result.provider || "Unknown",
    });
  } catch (error) {
    console.error("AI generation error:", error);
    const status = Number(error?.status) || 500;

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: error?.message || "AI generation failed.",
    });
  }
}
