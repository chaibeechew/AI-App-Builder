import { generateWithAI } from "./lib_ai.js";

const MAX_IDEA_LENGTH = 5000;

function cleanJson(text) {
  let value = String(text || "").trim();

  value = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return value;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const idea = req.body?.idea;

    if (typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({
        error: "Please provide an app idea.",
      });
    }

    const cleanIdea = idea.trim();

    if (cleanIdea.length > MAX_IDEA_LENGTH) {
      return res.status(413).json({
        error:
          `App idea is too long. Maximum ${MAX_IDEA_LENGTH} characters.`,
      });
    }

    const prompt = `
You are the AI engine of AI App Builder.

Turn the user's idea into a practical application specification.

USER IDEA:
${cleanIdea}

Return ONLY valid JSON.

Use exactly this structure:

{
  "specification": {
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
        "description": "What this feature does"
      }
    ]
  }
}

Rules:

- Create practical pages that match the user's idea.
- Create useful features that match the user's idea.
- Do not return Markdown.
- Do not return explanations.
- Do not return code fences.
- Do not include comments.
- Return JSON only.
`;

    const result =
      await generateWithAI(prompt);

    if (!result?.text) {
      throw new Error(
        "AI returned an empty response."
      );
    }

    const cleaned =
      cleanJson(result.text);

    let specification;

    try {
      specification =
        JSON.parse(cleaned);
    } catch {
      throw new Error(
        "AI returned invalid application JSON."
      );
    }

    if (
      !specification ||
      typeof specification !== "object" ||
      !specification.specification
    ) {
      throw new Error(
        "AI returned an invalid application specification."
      );
    }

    return res.status(200).json({
      ...specification,

      provider:
        result.provider || "Unknown",
    });

  } catch (error) {

    console.error(
      "AI generation error:",
      error
    );

    const status =
      Number(error?.status) || 500;

    return res.status(
      status >= 400 && status < 600
        ? status
        : 500
    ).json({
      error:
        error?.message ||
        "AI generation failed.",
    });
  }
}
