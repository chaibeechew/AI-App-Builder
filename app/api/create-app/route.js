import { NextResponse } from "next/server";
import { buildPlan } from "../../../../engine/autonomous-engine.js";
import { getProviderConfig } from "../../../../engine/model-router.js";
import { createPreview } from "../../../../engine/preview-engine.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        {
          error: "Please describe the app you want to build.",
        },
        { status: 400 }
      );
    }

    // 1. Safety + autonomous planning
    const plan = buildPlan(prompt);

    if (plan.blocked) {
      return NextResponse.json(plan, { status: 403 });
    }

    // 2. Model information
    const ai = getProviderConfig();

    // 3. Create preview
    const preview = createPreview({
      name: "AI Generated App",
      description: prompt,
    });

    return NextResponse.json({
      success: true,

      engine: "Autonomous AI Engine",

      model: ai,

      app: {
        name: "AI Generated App",
        description: prompt,

        stages: [
          "Create",
          "Modify",
          "Preview",
          "Test",
          "Security Scan",
          "Human Approval",
          "Publish",
        ],
      },

      preview,

      message:
        "Your app has been created and is ready for preview.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "AI App Builder failed.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
