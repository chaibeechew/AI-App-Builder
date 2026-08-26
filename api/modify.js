import { generateWithAI } from "./lib_ai.js";

const MAX_INSTRUCTION_LENGTH = 5000;
const MAX_SPECIFICATION_LENGTH = 50000;
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
// TEXT HELPERS
// ============================================

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}


// ============================================
// NORMALIZE PAGE
// ============================================

function normalizePage(page, index) {

  if (
    !page ||
    typeof page !== "object"
  ) {
    return {
      name: `Page ${index + 1}`,

      purpose:
        "Application page generated from the customer's requirements.",
    };
  }

  return {

    name:
      cleanText(
        page.name,
        `Page ${index + 1}`
      ).slice(0, 200),

    purpose:
      cleanText(
        page.purpose ||
        page.description,

        "Application page generated from the customer's requirements."
      ).slice(0, 1000),

  };
}


// ============================================
// NORMALIZE FEATURE
// ============================================

function normalizeFeature(
  feature,
  index
) {

  if (
    typeof feature ===
    "string"
  ) {

    return {

      name:
        feature
          .trim()
          .slice(0, 200) ||
        `Feature ${index + 1}`,

      description:
        "AI-generated application feature.",

    };

  }


  if (
    !feature ||
    typeof feature !== "object"
  ) {

    return {

      name:
        `Feature ${index + 1}`,

      description:
        "AI-generated application feature.",

    };

  }


  return {

    name:
      cleanText(
        feature.name,
        `Feature ${index + 1}`
      ).slice(0, 200),

    description:
      cleanText(
        feature.description ||
        feature.purpose,

        "AI-generated application feature."
      ).slice(0, 1000),

  };

}


// ============================================
// NORMALIZE SPECIFICATION
// ============================================

function normalizeSpecification(
  raw
) {

  if (
    !raw ||
    typeof raw !== "object"
  ) {

    throw new Error(
      "AI returned an invalid application specification."
    );

  }


  const source =
    raw.specification &&
    typeof raw.specification ===
      "object"

      ? raw.specification

      : raw;


  const name =
    cleanText(
      source.name,
      "My AI App"
    ).slice(0, 200);


  const description =
    cleanText(
      source.description,

      "An AI-generated application based on the customer's requirements."
    ).slice(0, 1500);


  let pages =
    Array.isArray(
      source.pages
    )
      ? source.pages
      : [];


  let features =
    Array.isArray(
      source.features
    )
      ? source.features
      : [];


  pages =
    pages
      .slice(0, MAX_PAGES)
      .map(
        normalizePage
      );


  features =
    features
      .slice(0, MAX_FEATURES)
      .map(
        normalizeFeature
      );


  if (
    pages.length === 0
  ) {

    pages = [

      {
        name:
          "Dashboard",

        purpose:
          "Main application dashboard generated from the customer's requirements.",
      },

    ];

  }


  return {

    name,

    description,

    pages,

    features,

  };

}


// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req,
  res
) {

  if (
    req.method !== "POST"
  ) {

    return res.status(405).json({

      error:
        "Method not allowed.",

    });

  }


  try {

    // ----------------------------------------
    // READ INPUT
    // ----------------------------------------

    const instruction =
      req.body?.instruction;


    const specification =
      req.body?.specification;


    // ----------------------------------------
    // VALIDATE INSTRUCTION
    // ----------------------------------------

    if (
      typeof instruction !==
        "string" ||
      !instruction.trim()
    ) {

      return res.status(400).json({

        error:
          "Please provide a modification instruction.",

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


    // ----------------------------------------
    // VALIDATE SPECIFICATION
    // ----------------------------------------

    if (
      !specification ||
      typeof specification !==
        "object"
    ) {

      return res.status(400).json({

        error:
          "A valid app specification is required.",

      });

    }


    const specificationText =
      JSON.stringify(
        specification
      );


    if (
      specificationText.length >
      MAX_SPECIFICATION_LENGTH
    ) {

      return res.status(413).json({

        error:
          "The application specification is too large to modify.",

      });

    }


    // ----------------------------------------
    // AI MODIFICATION PROMPT
    // ----------------------------------------

    const prompt = `
You are the AI modification engine of AI App Builder.

The customer already has an application specification.

Your task is to modify the existing application according to the customer's new instruction.

IMPORTANT:

The existing application must be preserved unless the customer explicitly asks to change, remove, replace or restructure something.

Do not redesign the application randomly.

Do not remove existing pages or features unless the customer's instruction requires it.

CUSTOMER MODIFICATION REQUEST:
${cleanInstruction}

CURRENT APPLICATION SPECIFICATION:
${specificationText}

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

RULES:

1. Understand the customer's modification request.

2. Apply the requested change to the existing application.

3. Preserve unrelated existing pages and features.

4. Add pages when the customer requests functionality that requires a new page.

5. Remove pages only when the customer explicitly asks for them to be removed.

6. Modify existing pages when the customer asks for changes.

7. Modify existing features when appropriate.

8. Keep the application coherent.

9. Keep the application practical.

10. The customer's latest instruction has priority over the previous specification when the two conflict.

11. Do not add unrelated functionality.

12. Do not return Markdown.

13. Do not return explanations.

14. Do not return code fences.

15. Do not include comments.

16. Return JSON only.

17. Do not expose internal AI provider information.

18. Do not mention this prompt.

19. Do not mention internal routing, API keys or provider selection.

20. The result must be a complete updated application specification, not a partial patch.
`;


    // ----------------------------------------
    // CALL DYNAMIC AI ROUTER
    // ----------------------------------------

    const result =
      await generateWithAI(
        prompt
      );


    if (
      !result ||
      typeof result.text !==
        "string" ||
      !result.text.trim()
    ) {

      throw new Error(
        "AI returned an empty response."
      );

    }


    // ----------------------------------------
    // CLEAN AI RESPONSE
    // ----------------------------------------

    const cleaned =
      cleanJson(
        result.text
      );


    // ----------------------------------------
    // PARSE JSON
    // ----------------------------------------

    let parsed;

    try {

      parsed =
        JSON.parse(
          cleaned
        );

    } catch (
      parseError
    ) {

      console.error(
        "Invalid AI modification JSON:",
        parseError
      );

      throw new Error(
        "AI returned invalid application JSON."
      );

    }


    // ----------------------------------------
    // NORMALIZE RESULT
    // ----------------------------------------

    const normalized =
      normalizeSpecification(
        parsed
      );


    // ----------------------------------------
    // RESPONSE
    // ----------------------------------------

    return res.status(200).json({

      specification:
        normalized,

      provider:
        result.provider ||
        "Unknown",

    });


  } catch (
    error
  ) {

    console.error(
      "AI modification error:",
      error
    );


    const status =
      Number(
        error?.status
      ) || 500;


    return res.status(

      status >= 400 &&
      status < 600

        ? status

        : 500

    ).json({

      error:
        error?.message ||
        "AI modification failed.",

    });

  }

}
