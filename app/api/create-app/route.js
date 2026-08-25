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

    // 1. Autonomous AI Engine
    const plan = await buildPlan(prompt);

    // 2. Block unsafe requests
    if (plan.blocked) {
      return NextResponse.json(plan, {
        status: 403,
      });
    }

    // 3. Model Router
    const ai = getProviderConfig();

    // 4. Generate Preview
    const preview = createPreview({
      name:
        plan.app?.name ||
        "AI Generated App",

      description:
        plan.app?.goal ||
        prompt,
    });

    // 5. Safety Test
    const test = testApp(preview);

    // 6. Human approval is always required
    const publishAllowed =
      test.passed === true;

    return NextResponse.json({
      success: true,

      engine: "Autonomous AI Engine",

      model: ai,

      app: {
        name:
          plan.app?.name ||
          "AI Generated App",

        description:
          plan.app?.goal ||
          prompt,

        stages:
          plan.app?.stages || [
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

        automaticPublishing: false,
      },

      message:
        "App created successfully and is ready for preview.",
    });
  } catch (error) {
    console.error(
      "CREATE_APP_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "AI App Builder failed.",

        details:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
