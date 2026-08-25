import { securityScan } from "./security-engine.js";
import { getProvider, getModel } from "./model-router.js";
import { generateWithAI } from "./ai-provider.js";

export async function buildPlan(prompt) {
  if (!prompt || typeof prompt !== "string") {
    return {
      blocked: true,
      reason: "Invalid app description.",
    };
  }

  // 1. Security check
  const scan = securityScan(prompt);

  if (!scan.safe) {
    return {
      blocked: true,
      reason:
        "This request appears to involve phishing, credential theft, impersonation, or fraudulent behavior.",
      scan,
    };
  }

  // 2. Provider
  const provider = getProvider();
  const model = getModel();

  // 3. Ask the AI to understand the app idea
  let aiOutput = "";

  try {
    aiOutput = await generateWithAI(prompt);
  } catch (error) {
    console.error(
      "AI_PROVIDER_ERROR:",
      error
    );

    // Safe fallback when the AI provider
    // is not available yet.
    aiOutput =
      "AI provider is not connected. Using safe fallback specification.";
  }

  // 4. Build application specification
  const appSpecification = {
    name: "AI Generated App",

    goal: prompt,

    aiOutput,

    provider,

    model,

    pages: [
      {
        id: "home",

        name: "Home",

        components: [
          {
            type: "header",

            title: "AI Generated App",
          },

          {
            type: "content",

            text: prompt,
          },

          {
            type: "button",

            label: "Get Started",

            action: "start",
          },
        ],
      },
    ],

    features: [
      "AI generated structure",
      "Responsive interface",
      "Editable components",
      "Preview mode",
      "Safety testing",
    ],

    stages: [
      "Create",
      "Modify",
      "Preview",
      "Test",
      "Security Scan",
      "Human Approval",
      "Publish",
    ],

    safety: {
      scanned: true,

      humanApprovalRequired: true,

      automaticPublishing: false,
    },
  };

  return {
    blocked: false,

    provider,

    model,

    app: appSpecification,

    scan,

    message:
      "Autonomous AI Engine generated an application specification.",
  };
}
