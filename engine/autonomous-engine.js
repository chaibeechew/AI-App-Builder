import { securityScan } from "./security-engine.js";
import { getProvider, getModel } from "./model-router.js";

export async function buildPlan(prompt) {
  if (!prompt || typeof prompt !== "string") {
    return {
      blocked: true,
      reason: "Invalid app description.",
    };
  }

  // --------------------------------------------------
  // 1. Security check
  // --------------------------------------------------

  const scan = securityScan(prompt);

  if (!scan.safe) {
    return {
      blocked: true,

      reason:
        "This request appears to involve phishing, credential theft, impersonation, or fraudulent behavior.",

      scan,
    };
  }

  // --------------------------------------------------
  // 2. Select AI provider
  // --------------------------------------------------

  const provider = getProvider();
  const model = getModel();

  // --------------------------------------------------
  // 3. Create structured App Specification
  // --------------------------------------------------

  const appSpecification = {
    name: "AI Generated App",

    goal: prompt,

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
      "Responsive interface",
      "AI generated structure",
      "Editable components",
      "Preview mode",
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
      "App specification generated successfully.",
  };
}
