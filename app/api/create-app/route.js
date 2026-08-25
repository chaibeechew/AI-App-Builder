import { NextResponse } from "next/server";
import { buildPlan } from "../../../../engine/autonomous-engine.js";

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

    const result = buildPlan(prompt);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "AI App Builder failed.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}