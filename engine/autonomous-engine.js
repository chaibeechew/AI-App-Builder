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
  return `You are the AI engine of an AI App Builder.\n\nThe user wants to build:\n\n"${userIdea}"\n\nCreate a practical app specification.\n\nReturn ONLY valid JSON:\n{\n  "name": "App name",\n  "description": "Short description",\n  "pages": [{"name":"Page name","purpose":"What this page does"}],\n  "features": [{"name":"Feature name","description":"What the feature does"}],\n  "data": [{"name":"Data type","fields":["field1","field2"]}],\n  "actions": [{"name":"Action name","description":"What happens"}]\n}\n\nRules:\n1. Keep the app practical.\n2. Infer missing details intelligently.\n3. Create useful pages and features.\n4. Return JSON only.\n5. Do not return source code.`;
}

export async function runAutonomousEngine(userIdea) {
  if (!userIdea || !userIdea.trim()) throw new Error("Please describe the app you want to build.");
  const idea = userIdea.trim();
  console.log("AI App Builder: starting multi-provider Autonomous AI");
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
