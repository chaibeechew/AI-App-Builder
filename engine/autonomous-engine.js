import { generateWithFallback } from "./ai-provider.js";

function extractJson(text) {
  if (!text) throw new Error("AI provider returned an empty response");
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("AI provider did not return valid JSON");
  try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)); }
  catch { throw new Error("AI provider returned invalid JSON"); }
}

function buildPrompt(userIdea) {
  return `You are the Autonomous AI Engine of AI App Builder.

The user wants to build this application:
"${userIdea}"

Turn the idea into a practical application blueprint that the next stages can render and test.

Return ONLY valid JSON. No Markdown, no code fences, no explanations.

Use exactly this structure:
{
  "name": "App name",
  "description": "Short description",
  "pages": [
    {
      "id": "home",
      "name": "Home",
      "route": "/",
      "description": "What this page does",
      "components": ["header", "main content"]
    }
  ],
  "features": [
    {"name":"Feature name","description":"What the feature does"}
  ],
  "data": {
    "EntityName": {"fields":["field1","field2"]}
  },
  "actions": [
    {"name":"Action name","description":"What happens"}
  ],
  "navigation": [
    {"label":"Home","route":"/"}
  ]
}

Rules:
1. The user's idea is the source of truth.
2. Infer only reasonable missing details.
3. Every page must have a unique route.
4. The first page must use route "/".
5. Pages must contain renderable component descriptions.
6. Features must directly support the user's idea.
7. Data must be an object, not an array.
8. Actions must describe useful user workflows.
9. Navigation must reference real page routes.
10. Keep the blueprint practical and suitable for Preview, Modify, Test and Publish.
11. Do not expose which AI provider generated the blueprint.`;
}

export async function runAutonomousEngine(userIdea) {
  if (!userIdea || !userIdea.trim()) throw new Error("Please describe the app you want to build.");
  const idea = userIdea.trim();
  console.log("AI App Builder: starting Autonomous AI Engine");
  const { provider, result } = await generateWithFallback(buildPrompt(idea));
  const specification = extractJson(result);
  const model = process.env[`${provider.toUpperCase()}_MODEL`] || undefined;
  console.log("AI App Builder: specification created", { provider });
  return {
    status: "preview_ready",
    idea,
    specification,
    aiProvider: provider,
    ...(model ? { aiModel: model } : {}),
    nextStep: "preview",
    test: { status: "pending" },
    security: { status: "pending" },
    publish: { allowed: false, requiresHumanApproval: true },
  };
}
