export function createPreview(appPlan) {
  if (!appPlan || typeof appPlan !== "object") {
    throw new Error("Invalid app plan.");
  }

  return {
    type: "app-preview",

    version: "0.1",

    app: {
      name: appPlan.name || "AI Generated App",

      description:
        appPlan.description ||
        "AI generated application",

      pages: [
        {
          id: "home",
          name: "Home",
          type: "home",
          components: [
            {
              type: "header",
              title: appPlan.name || "My App",
            },

            {
              type: "content",
              text:
                appPlan.description ||
                "Welcome to your AI generated app.",
            },

            {
              type: "button",
              label: "Get Started",
              action: "start",
            },
          ],
        },
      ],
    },

    safety: {
      scanned: true,
      publishRequiresApproval: true,
    },
  };
}