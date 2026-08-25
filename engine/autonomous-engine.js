import { generateWithFallback } from "./ai-provider.js";
import { createPreview } from "./preview-engine.js";
import { runTest } from "./test-engine.js";
import { securityCheck } from "./security-engine.js";
import { checkPublishPermission } from "./publish-permission.js";

function extractJson(text) {
  if (!text) {
    throw new Error("AI returned an empty response");
  }

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI did not return valid JSON");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function buildPrompt(userIdea) {
  return `
You are the planning engine of an AI App Builder.

The user wants to build:

"${userIdea}"

Your job is to convert this idea into a practical app specification.

Return ONLY valid JSON.

Use this exact structure:

{
  "name": "App name",
  "description": "Short description",
  "pages": [
    {
      "name": "Page name",
      "purpose": "What this page does"
    }
  ],
  "features": [
    {
      "name": "Feature name",
      "description": "What the feature does"
    }
  ],
  "data": [
    {
      "name": "Data type",
      "fields": ["field1", "field2"]
    }
  ],
  "actions": [
    {
      "name": "Action name",
      "description": "What happens"
    }
  ]
}

Rules:

1. Keep the app simple enough to build.
2. Create only pages that are useful.
3. Infer missing details intelligently.
4. Do not include explanations outside JSON.
5. Do not include source code.
6. The result must describe an app that a normal non-technical user can understand.
`;
}

export async function runAutonomousEngine(userIdea) {
  if (!userIdea || !userIdea.trim()) {
    throw new Error("Please describe the app you want to build.");
  }

  const planResponse = await generateWithFallback(
    buildPrompt(userIdea.trim())
  );

  const specification = extractJson(planResponse.result);

  const preview = await createPreview({
    idea: userIdea.trim(),
    specification,
  });

  const test = await runTest(preview);

  const security = await securityCheck(preview);

  const publish = await checkPublishPermission({
    test,
    security,
  });

  return {
    status: "ready",
    idea: userIdea.trim(),
    specification,
    preview,
    test,
    security,
    publish,
    aiProvider: planResponse.provider,
  };
}
