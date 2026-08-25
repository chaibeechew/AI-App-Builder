import { NextResponse } from "next/server";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";

export async function POST(request) {
  try {
    const body = await request.json();

    const idea = String(
      body?.idea || body?.prompt || ""
    ).trim();

    if (!idea) {
      return NextResponse.json(
        {
          success: false,
          error: "Please describe the app you want to build.",
        },
        { status: 400 }
      );
    }

    const result = await runAutonomousEngine(idea);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("AI App Builder error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to generate the app.",
      },
      { status: 500 }
    );
  }
}
