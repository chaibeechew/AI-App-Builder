import { NextResponse } from "next/server";
import { buildPlan } from "../../../../engine/autonomous-engine.js";
import { getProviderConfig } from "../../../../engine/model-router.js";
import { createPreview } from "../../../../engine/preview-engine.js";
import { testApp } from "../../../../engine/test-engine.js";

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

    // 1. Autonomous planning + safety
    const plan = buildPlan(prompt);

    if (plan.blocked) {
      return NextResponse.json(plan, {
        status: 403,
      });
    }

    // 2. Model router
    const ai = getProviderConfig();

    // 3. Generate preview
    const preview = createPreview({
      name: "AI Generated App",
      description: prompt,
    });

    // 4. Test generated app
    const test = testApp(preview);

    // 5. Publishing is NEVER automatic
    const publishAllowed =
      test.passed && !preview.safety?.publishBlocked;

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

      test,

      publish: {
        allowed: publishAllowed,
        requiresHumanApproval: true,
      },

      message: test.passed
        ? "App created successfully and passed the initial safety test."
        : "App created but requires safety review before publishing.",
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
