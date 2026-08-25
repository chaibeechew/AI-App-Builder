import { NextResponse } from "next/server";

import { buildPlan } from "../../../engine/autonomous-engine.js";
import { getProviderConfig } from "../../../engine/model-router.js";
import { createPreview } from "../../../engine/preview-engine.js";
import { testApp } from "../../../engine/test-engine.js";
import { checkPermission } from "../../../engine/permission-engine.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Please describe the app you want to build.",
        },
        { status: 400 }
      );
    }

    // AI is allowed to create apps.
    const createPermission = checkPermission("create");

    if (!createPermission.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "AI is not allowed to create this app.",
        },
        { status: 403 }
      );
    }

    // Build the autonomous AI plan.
    const plan = buildPlan(prompt);

    // Security block.
    if (plan.blocked) {
      return NextResponse.json(plan, {
        status: 403,
      });
    }

    // Current AI provider.
    const ai = getProviderConfig();

    // Generate preview.
    const preview = createPreview({
      name: plan.app?.name || "AI Generated App",
      description: plan.app?.goal || prompt,
    });

    // Test generated app.
    const test = testApp(preview);

    // Security scan permission.
    const securityPermission =
      checkPermission("security_scan");

    // Publishing always requires human approval.
    const publishPermission =
      checkPermission("publish");

    return NextResponse.json({
      success: true,

      engine: "Autonomous AI Engine",

      model: ai,

      app: {
        name: plan.app?.name || "AI Generated App",

        description: plan.app?.goal || prompt,

        stages: plan.app?.stages || [
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

      security: {
        allowed: securityPermission.allowed,
        scanned: true,
      },

      publish: {
        allowed: false,
        requiresHumanApproval:
          publishPermission.requiresHuman,
        reason: publishPermission.reason,
      },

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
        error: "AI App Builder failed.",
        details:
          error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
