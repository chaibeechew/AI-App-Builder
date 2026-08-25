import { securityScan } from "./security-engine.js";

export function buildPlan(prompt) {
  const scan = securityScan(prompt);

  if (!scan.safe) {
    return {
      blocked: true,
      reason:
        "This request appears to involve phishing, credential theft, impersonation, or fraudulent behavior.",
      scan,
    };
  }

  return {
    blocked: false,

    app: {
      name: "AI Generated App",

      goal: prompt,

      stages: [
        "Create",
        "Modify",
        "Preview",
        "Test",
        "Security Scan",
        "Publish",
      ],

      safety: "A final security check is required before publishing.",
    },
  };
}