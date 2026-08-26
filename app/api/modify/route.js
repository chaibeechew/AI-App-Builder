import { NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.6-flash";

export async function POST(request) {
  try {
    const body = await request.json();

    const instruction = body?.instruction?.trim();
    const specification = body?.specification;

    if (!instruction) {
      return NextResponse.json(
        { error: "Modification instruction is required." },
        { status: 400 }
      );
    }

    if (!specification) {
      return NextResponse.json(
        { error: "App specification is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Please add it in Vercel Environment Variables.",
        },
        { status: 500 }
      );
    }

    const prompt = `
You are the modification engine for an AI App Builder.

The user already has an app specification.

They want to modify the app according to this instruction:

"${instruction}"

Current app specification:

${JSON.stringify(specification, null, 2)}

Return ONLY valid JSON.

Keep the existing structure and functionality unless the user's instruction requires a change.

Preserve existing pages and features when possible.

Apply the requested modification intelligently.

Return JSON in this structure:

{
  "name": "App name",
  "description": "App description",
  "pages": [
    {
      "name": "Page name",
      "purpose": "Page purpose"
    }
  ],
  "features": [
    {
      "name": "Feature name",
      "description": "Feature description"
    }
  ],
  "dataModels": [],
  "actions": []
}

Do not include markdown.
Do not include explanations outside JSON.
`;

    console.log(
      `AI App Builder: modifying app with ${GEMINI_MODEL}`
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini modify error:", data);

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            `Gemini HTTP ${response.status}`,
        },
        { status: response.status }
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty modification response.",
        },
        { status: 500 }
      );
    }

    let modifiedSpecification;

    try {
      modifiedSpecification = JSON.parse(text);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini modification response:",
        text
      );

      return NextResponse.json(
        {
          error:
            "Gemini returned invalid JSON. Please try the modification again.",
        },
        { status: 500 }
      );
    }

    console.log(
      "AI App Builder: modification completed"
    );

    return NextResponse.json({
      success: true,
      specification: modifiedSpecification,
    });
  } catch (error) {
    console.error("Modify API error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while modifying the app.",
      },
      { status: 500 }
    );
  }
}