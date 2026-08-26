import { generateWithAI } from "./lib_ai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const idea = req.body?.idea;

    if (!idea || !idea.trim()) {
      return res.status(400).json({
        error: "Please provide an app idea.",
      });
    }

    const prompt = `
You are an AI App Builder.

Turn the user's idea into a structured application specification.

User idea:
${idea.trim()}

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

Create practical pages and features that match the user's idea.
Do not include Markdown.
Do not include code fences.
Return JSON only.
`;

    const result = await generateWithAI(prompt);

    let specification;

    try {
      specification = JSON.parse(result.text);
    } catch {
      const cleaned = result.text
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

      specification = JSON.parse(cleaned);
    }

    return res.status(200).json({
      ...specification,
      provider: result.provider,
    });

  } catch (error) {
    console.error("AI generation error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "AI generation failed.",
    });
  }
}
