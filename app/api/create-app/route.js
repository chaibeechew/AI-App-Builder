import { NextResponse } from "next/server";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";

export async function POST(request) {
  try {
    const body = await request.json();

    const prompt = String(
      body?.prompt || body?.idea || ""
    ).trim();

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Please describe the app you want to build.",
        },
        { status: 400 }
      );
    }

    const result = await runAutonomousEngine(prompt);

    return NextResponse.json({
      success: true,
      ...result,

      engine: "Autonomous AI Engine",

      permissions: {
        create: true,
        preview: true,
        test: true,
        securityScan: true,
        publish: false,
        humanApprovalRequired: true,
      },

      message:
        "App created successfully. Human approval is required before publishing.",
    });
  } catch (error) {
    console.error("CREATE_APP_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "AI App Builder failed.",
      },
      { status: 500 }
    );
  }
}
