import { generateWithAI } from "./lib_ai.js";

const MAX_INSTRUCTION_LENGTH = 5000;
const MAX_SPECIFICATION_LENGTH = 30000;

function cleanJson(text) {
  return String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const instruction = req.body?.instruction;
    const specification = req.body?.specification;

    if (
      typeof instruction !== "string" ||
      !instruction.trim()
    ) {
      return res.status(400).json({
        error: "Please provide a modification instruction.",
      });
    }

    if (
      !specification ||
      typeof specification !== "object"
    ) {
      return res.status(400).json({
        error: "A valid app specification is required.",
      });
    }

    const cleanInstruction =
      instruction.trim();

    if (
      cleanInstruction.length >
      MAX_INSTRUCTION_LENGTH
    ) {
      return res.status(413).json({
        error:
          `Modification instruction is too long. Maximum ${MAX_INSTRUCTION_LENGTH} characters.`,
      });
    }

    const specificationText =
      JSON.stringify(specification);

    if (
      specificationText.length >
      MAX_SPECIFICATION_LENGTH
    ) {
      return res.status(413).json({
        error:
          "Application specification is too large.",
      });
    }

    const prompt = `
You are the AI modification engine for AI App Builder.

The user already has an application specification.

CURRENT APPLICATION SPECIFICATION:
${specificationText}

USER'S REQUEST:
${cleanInstruction}

Modify the existing application specification according to the user's request.

IMPORTANT RULES:

1. Keep existing pages and features unless the user asks to remove them.
2. Add new pages when necessary.
3. Add new features when necessary.
4. Update descriptions when necessary.
5. Keep the application practical and coherent.
6. Do not return Markdown.
7. Do not return explanations.
8. Do not return code fences.
9. Return ONLY valid JSON.

Return exactly this structure:

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

    let modified;

    try {
      modified =
        JSON.parse(cleaned);
    } catch {
      throw new Error(
        "AI returned invalid modification JSON."
      );
    }

    if (
      !modified ||
      typeof modified !== "object" ||
      !modified.specification ||
      typeof modified.specification !== "object"
    ) {
      throw new Error(
        "AI returned an invalid application specification."
      );
    }

    const updated =
      modified.specification;

    if (!Array.isArray(updated.pages)) {
      updated.pages = [];
    }

    if (!Array.isArray(updated.features)) {
      updated.features = [];
    }

    return res.status(200).json({
      specification: updated,
      provider:
        result.provider || "Unknown",
    });

  } catch (error) {

    console.error(
      "AI modification error:",
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
        "AI modification failed.",
    });
  }
}
